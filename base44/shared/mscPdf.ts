// Converts the filled MSC manifest HTML (pdf2htmlEX output) into a real PDF.
// The template's static layout (Arabic text, borders, stamps) lives in the
// per-page background PNGs; the text layer only holds Latin values, so the
// PDF is rebuilt by drawing the backgrounds and re-drawing the text layer.
import { PDFDocument, StandardFonts, rgb } from "npm:pdf-lib@1.17.1";

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

        const text = decodeText(inner);
        if (!text.trim()) continue;

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

        if (/text-align:center/.test(style) && cCtx && cCtx.width) {
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
        const tw = font.widthOfTextAtSize(text, size);
        page.drawText(text, { x: left + (width - tw) / 2, y: bottom + size * 0.21, size, font, color: rgb(0, 0, 0) });
      } else {
        stack.push(null);
      }
    }
  }

  return await doc.save();
}