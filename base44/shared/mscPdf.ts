// Converts the filled MSC manifest HTML (pdf2htmlEX output) into a real PDF.
// The template's static layout (Arabic text, borders, stamps) lives in the
// per-page background PNGs; the text layer only holds Latin values, so the
// PDF is rebuilt by drawing the backgrounds and re-drawing the text layer.
import { PDFDocument, StandardFonts, rgb } from "npm:pdf-lib@1.17.1";

// The template's Arabic text is stored by pdf2htmlEX as pre-shaped glyphs in
// Unicode's Private-Use Area, rendered through per-font @font-face WOFF fonts.
// To reproduce the Arabic in the PDF we decode each WOFF back to sfnt (TTF/OTF)
// and embed it, then draw the PUA codepoints with the matching font.
async function inflateZlib(comp) {
  // WOFF tables are zlib/deflate-compressed; the exact "deflate" variant the
  // runtime expects varies, so try each in turn.
  for (const fmt of ["deflate", "deflate-raw", "gzip"]) {
    try {
      const ds = new DecompressionStream(fmt);
      const stream = new Blob([comp]).stream().pipeThrough(ds);
      return new Uint8Array(await new Response(stream).arrayBuffer());
    } catch (e) { /* try next format */ }
  }
  throw new Error("inflate failed for WOFF table");
}

async function woffToSfnt(woff) {
  const dv = new DataView(woff.buffer, woff.byteOffset, woff.byteLength);
  const flavor = dv.getUint32(4);
  const numTables = dv.getUint16(12);
  const totalSfntSize = dv.getUint32(16);
  const sfnt = new Uint8Array(totalSfntSize);
  const sdv = new DataView(sfnt.buffer);
  sdv.setUint32(0, flavor);
  sdv.setUint16(4, numTables);
  let entrySelector = 0, pow = 1;
  while (pow * 2 <= numTables) { pow *= 2; entrySelector++; }
  sdv.setUint16(6, pow * 16);
  sdv.setUint16(8, entrySelector);
  sdv.setUint16(10, numTables * 16 - pow * 16);
  const entries = [];
  for (let i = 0; i < numTables; i++) {
    const e = 44 + i * 20;
    const tag = woff.slice(e, e + 4);
    const off = dv.getUint32(e + 4);
    const len = dv.getUint32(e + 8);
    const origLen = dv.getUint32(e + 12);
    const checksum = dv.getUint32(e + 16);
    let data;
    if (len === origLen) {
      data = woff.slice(off, off + origLen);
    } else {
      data = await inflateZlib(woff.slice(off, off + len));
    }
    entries.push({ tag, checksum, data, origLen });
  }
  let dirOff = 12;
  let dataOff = 12 + numTables * 16;
  for (const en of entries) {
    for (let j = 0; j < 4; j++) sdv.setUint8(dirOff + j, en.tag[j]);
    sdv.setUint32(dirOff + 4, en.checksum);
    sdv.setUint32(dirOff + 8, dataOff);
    sdv.setUint32(dirOff + 12, en.origLen);
    dirOff += 16;
    sfnt.set(en.data, dataOff);
    dataOff += en.origLen;
    while (dataOff % 4) dataOff++;
  }
  return sfnt;
}

function tokOf(classes, prefix) {
  const re = new RegExp("^" + prefix + "[0-9a-z]+$");
  return (classes || "").split(/\s+/).find((c) => re.test(c));
}

function decodeText(inner) {
  return inner
    .replace(/<span[^>]*><\/span>/g, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/\u00a0/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/[^\x20-\x7E\u00A1-\u00FF]/g, "");
}

export async function buildPdfFromMscHtml(html) {
  const parts = html.split(/(<div id="pf[123]")/);
  const head = parts[0];
  const pages = [];
  for (let i = 1; i < parts.length; i += 2) pages.push(parts[i] + (parts[i + 1] || ""));

  // class -> px value maps from the template's stylesheet
  const css = {};
  head.replace(/\.([a-z_]+[0-9a-z]*)\{(?:left|bottom|width|height|font-size):(-?[0-9.]+)px/g, (m, cls, val) => {
    css[cls] = parseFloat(val);
    return m;
  });
  const scales = {};
  head.replace(/\.(m[0-9a-z]+)\{[^}]*matrix\((-?[0-9.]+)/g, (m, cls, a) => {
    scales[cls] = parseFloat(a);
    return m;
  });
  const colors = {};
  head.replace(/\.(fc[0-9a-z]+)\{color:rgb\((\d+),(\d+),(\d+)\)/g, (m, cls, r, g, b) => {
    colors[cls] = rgb(r / 255, g / 255, b / 255);
    return m;
  });
  const transparent = new Set();
  head.replace(/\.(fc[0-9a-z]+)\{color:transparent/g, (m, cls) => {
    transparent.add(cls);
    return m;
  });

  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.HelveticaBold);

  // Embed the template's @font-face WOFF fonts (ff1..ffN) so PUA-mapped Arabic
  // glyphs can be re-drawn. Falls back to Helvetica if embedding fails.
  const fontMap = {};
  try {
    const ffRe = /@font-face\s*\{([^}]+)\}/g;
    let fm;
    while ((fm = ffRe.exec(head))) {
      const fam = (fm[1].match(/font-family:["']?([^"';]+)/) || [])[1];
      const b64 = (fm[1].match(/base64,([A-Za-z0-9+/=]+)/) || [])[1];
      if (!fam || !b64) continue;
      try {
        const woff = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
        const sfnt = await woffToSfnt(woff);
        fontMap[fam] = await doc.embedFont(sfnt);
      } catch (e) {
        console.error("font embed failed for", fam, e.message);
      }
    }
  } catch (e) {
    console.error("font-face parse failed:", e.message);
  }

  for (const pageHtml of pages) {
    const pf = pageHtml.match(/class="pf ([^"]+)"/);
    const W = (pf && css[tokOf(pf[1], "w")]) || 893;
    const H = (pf && css[tokOf(pf[1], "h")]) || 1263;
    const page = doc.addPage([W, H]);

    // 1) background images (all static layout, Arabic labels, stamps, QR)
    const imgRe = /<img class="bi([^"]*)"[^>]*?src="data:image\/(png|jpe?g);base64,([^"]+)"/g;
    let im;
    while ((im = imgRe.exec(pageHtml))) {
      const bytes = Uint8Array.from(atob(im[3]), (c) => c.charCodeAt(0));
      const img = im[2] === "png" ? await doc.embedPng(bytes) : await doc.embedJpg(bytes);
      page.drawImage(img, {
        x: css[tokOf(im[1], "x")] ?? 0,
        y: css[tokOf(im[1], "y")] ?? 0,
        width: css[tokOf(im[1], "w")] ?? W,
        height: css[tokOf(im[1], "h")] ?? H
      });
    }

    // 2) text layer — walk divs keeping a stack so `t` divs inside `c` clip
    // containers are positioned relative to their container box
    const re = /<div\b[^>]*>|<\/div>/g;
    const stack = [];
    let m;
    while ((m = re.exec(pageHtml))) {
      if (m[0] === "</div>") {
        stack.pop();
        continue;
      }
      const cls = (m[0].match(/class="([^"]*)"/) || [])[1] || "";
      const style = (m[0].match(/style="([^"]*)"/) || [])[1] || "";

      if (/^c(\s|$)/.test(cls)) {
        let left = css[tokOf(cls, "x")] ?? 0;
        let bottom = css[tokOf(cls, "y")] ?? 0;
        const bo = style.match(/bottom:(-?[0-9.]+)px/);
        if (bo) bottom = parseFloat(bo[1]);
        const lo = style.match(/left:(-?[0-9.]+)px/);
        if (lo) left = parseFloat(lo[1]);
        stack.push({ left, bottom, width: css[tokOf(cls, "w")] ?? 0 });
      } else if (/^t(\s|$)/.test(cls)) {
        // consume the t div's inner content up to its closing tag
        const closeIdx = pageHtml.indexOf("</div>", re.lastIndex);
        const inner = pageHtml.slice(re.lastIndex, closeIdx);
        re.lastIndex = closeIdx + 6;

        // skip invisible selection text (image-fallback templates render it transparent)
        const spanFc = (inner.match(/<span class="[^"]*\b(fc[0-9a-z]+)\b/) || [])[1];
        if (transparent.has(tokOf(cls, "fc")) || (spanFc && transparent.has(spanFc))) continue;

        const rawText = inner
          .replace(/<span[^>]*><\/span>/g, " ")
          .replace(/<[^>]+>/g, "")
          .replace(/&nbsp;/g, " ")
          .replace(/\u00a0/g, " ")
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">");
        const hasPua = /[\uE000-\uF8FF]/.test(rawText) || /[\u{F0000}-\u{FFFFD}]/u.test(rawText);
        let text, drawFont;
        if (hasPua) {
          text = rawText.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");
          const ffCls = (inner.match(/\bff([0-9a-z]+)\b/) || [])[1];
          const fam = ffCls ? "ff" + ffCls : null;
          drawFont = (fam && fontMap[fam]) ? fontMap[fam] : null;
        } else {
          text = rawText.replace(/[^\x20-\x7E\u00A1-\u00FF]/g, "");
          drawFont = font;
        }
        if (!text.trim() || !drawFont) continue;

        const scale = scales[tokOf(cls, "m")] ?? 1;
        const size = (css[tokOf(cls, "fs")] ?? 40) * scale;
        const color = colors[tokOf(cls, "fc")] || rgb(0, 0, 0);
        const cCtx = [...stack].reverse().find((s) => s);

        let tLeft = css[tokOf(cls, "x")] ?? 0;
        const tBottom = css[tokOf(cls, "y")] ?? 0;
        const lo = style.match(/left:(-?[0-9.]+)px/);
        if (lo) tLeft = parseFloat(lo[1]);

        const baseLeft = cCtx ? cCtx.left : 0;
        const y = (cCtx ? cCtx.bottom : 0) + tBottom + size * 0.21;

        if (hasPua) {
          try { page.drawText(text, { x: baseLeft + tLeft, y, size, font: drawFont, color }); }
          catch (e) { /* missing glyph — skip this div */ }
        } else if (/text-align:center/.test(style) && cCtx && cCtx.width) {
          const trimmed = text.trim();
          const tw = font.widthOfTextAtSize(trimmed, size);
          page.drawText(trimmed, { x: baseLeft + (cCtx.width - tw) / 2, y, size, font, color });
        } else {
          page.drawText(text, { x: baseLeft + tLeft, y, size, font, color });
        }
      } else if (/^b44-cell(\s|$)/.test(cls)) {
        // overlay cells injected by blank-form templates (position in inline style)
        const closeIdx = pageHtml.indexOf("</div>", re.lastIndex);
        const inner = pageHtml.slice(re.lastIndex, closeIdx);
        re.lastIndex = closeIdx + 6;

        const text = decodeText(inner).trim();
        if (!text) continue;
        const left = parseFloat((style.match(/left:(-?[0-9.]+)px/) || [])[1] || "0");
        const bottom = parseFloat((style.match(/bottom:(-?[0-9.]+)px/) || [])[1] || "0");
        const width = parseFloat((style.match(/width:(-?[0-9.]+)px/) || [])[1] || "0");
        const size = parseFloat((style.match(/font-size:(-?[0-9.]+)px/) || [])[1] || "13");
        const align = (style.match(/text-align:(left|right|center)/) || [])[1] || "center";
        const tw = font.widthOfTextAtSize(text, size);
        const x = align === "right" ? left + width - tw
                : align === "left" ? left
                : left + (width - tw) / 2;
        page.drawText(text, { x, y: bottom + size * 0.21, size, font, color: rgb(0, 0, 0) });
      } else {
        stack.push(null);
      }
    }
  }

  return await doc.save();
}

// Diagnostic helper: tries to decode + embed every @font-face in the template
// and reports per-font success/failure (used by the ?debug=fonts query param).
export async function diagnoseFonts(html) {
  const head = html.slice(0, html.indexOf("</head>"));
  const doc = await PDFDocument.create();
  const ffRe = /@font-face\s*\{([^}]+)\}/g;
  let fm, results = [];
  while ((fm = ffRe.exec(head))) {
    const fam = (fm[1].match(/font-family:["']?([^"';]+)/) || [])[1];
    const b64 = (fm[1].match(/base64,([A-Za-z0-9+/=]+)/) || [])[1];
    if (!fam || !b64) continue;
    const r = { fam };
    try {
      const woff = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      const sfnt = await woffToSfnt(woff);
      r.sfntLen = sfnt.length;
      r.sfntFlavor = Array.from(sfnt.slice(0, 4)).join(",");
      await doc.embedFont(sfnt);
      r.embedded = true;
    } catch (e) {
      r.error = e.message;
    }
    results.push(r);
  }
  return results;
}