// Converts the filled MSC manifest HTML (pdf2htmlEX output) into a real PDF.
// The template's static layout (Arabic text, borders, stamps) lives in the
// per-page background PNGs; the text layer only holds Latin values plus the
// contract body Arabic, which pdf2htmlEX stores as pre-shaped glyphs in the
// Unicode Private-Use Area (BMP U+E000–U+F8FF and supplementary U+F0000+),
// rendered through per-font @font-face WOFF fonts.
//
// To reproduce the Arabic in the PDF we decode each WOFF back to sfnt (TTF/OTF)
// and embed it. pdf-lib/fontkit only consults a SINGLE cmap subtable when
// encoding, and requires a format-4 (BMP) subtable — without one every codepoint
// resolves to .notdef. Format 4 cannot address supplementary codepoints, so we
// collect every (codepoint -> glyphId) pair from all original subtables, remap
// them into one contiguous BMP range (U+E000+), rewrite the font's cmap as a
// single format-4 subtable over that range, and translate the drawn text to the
// remapped codepoints. This makes every PUA glyph resolve under fontkit.
import { PDFDocument, StandardFonts, rgb } from "npm:pdf-lib@1.17.1";
import fontkit from "npm:@pdf-lib/fontkit@1.1.1";

// WOFF tables are zlib/deflate-compressed; the exact "deflate" variant the
// runtime expects varies, so try each in turn.
async function inflateZlib(comp) {
  for (const fmt of ["deflate", "deflate-raw", "gzip"]) {
    try {
      const ds = new DecompressionStream(fmt);
      const stream = new Blob([comp]).stream().pipeThrough(ds);
      return new Uint8Array(await new Response(stream).arrayBuffer());
    } catch (e) { /* try next format */ }
  }
  throw new Error("inflate failed for WOFF table");
}

// Big-endian readers/writers for raw table bytes.
function rdU16(d, o) { return (d[o] << 8) | d[o + 1]; }
function rdU32(d, o) { return (d[o] << 24) | (d[o + 1] << 16) | (d[o + 2] << 8) | d[o + 3]; }
function wrU16(d, o, v) { d[o] = (v >> 8) & 0xFF; d[o + 1] = v & 0xFF; }
function wrU32(d, o, v) { d[o] = (v >>> 24) & 0xFF; d[o + 1] = (v >> 16) & 0xFF; d[o + 2] = (v >> 8) & 0xFF; d[o + 3] = v & 0xFF; }

// Collect every (codepoint -> glyphId) mapping from all cmap subtables of a font
// (format 4 covers BMP PUA; format 12 covers supplementary PUA).
function collectCmapMappings(cmap) {
  const numSub = rdU16(cmap, 2);
  const map = new Map();
  for (let i = 0; i < numSub; i++) {
    const rec = 4 + i * 8;
    const subOff = rdU32(cmap, rec + 4);
    if (subOff + 2 > cmap.length) continue;
    const fmt = rdU16(cmap, subOff);
    if (fmt === 4) {
      const segCount = rdU16(cmap, subOff + 6) / 2;
      const endOff = subOff + 14;
      const startOff = endOff + segCount * 2 + 2;
      const deltaOff = startOff + segCount * 2;
      const rangeOff = deltaOff + segCount * 2;
      for (let s = 0; s < segCount; s++) {
        const end = rdU16(cmap, endOff + s * 2);
        const start = rdU16(cmap, startOff + s * 2);
        const delta = (rdU16(cmap, deltaOff + s * 2) << 16) >> 16; // signed
        const ro = rdU16(cmap, rangeOff + s * 2);
        for (let cp = start; cp <= end; cp++) {
          if (cp === 0xFFFF) continue;
          let gid;
          if (ro === 0) gid = (cp + delta) & 0xFFFF;
          else {
            const loc = rangeOff + s * 2 + ro + 2 * (cp - start);
            if (loc + 2 > cmap.length) continue;
            const g = rdU16(cmap, loc);
            gid = g === 0 ? 0 : (g + delta) & 0xFFFF;
          }
          if (gid) map.set(cp, gid);
        }
      }
    } else if (fmt === 12) {
      const numGroups = rdU32(cmap, subOff + 12);
      for (let g = 0; g < numGroups; g++) {
        const gOff = subOff + 16 + g * 12;
        if (gOff + 12 > cmap.length) break;
        const start = rdU32(cmap, gOff);
        const end = rdU32(cmap, gOff + 4);
        const startGid = rdU32(cmap, gOff + 8);
        for (let cp = start; cp <= end; cp++) {
          const gid = cp - start + startGid;
          if (gid) map.set(cp, gid);
        }
      }
    }
  }
  return map;
}

// Build a single format-4 cmap that maps a contiguous BMP range (U+E000+) to the
// font's glyphs, and a translation table from each original codepoint to its
// remapped BMP codepoint. Returns { bytes, remap } or null on failure.
function buildRemappedCmap(cmapData) {
  const map = collectCmapMappings(cmapData);
  if (!map.size) return null;
  const cps = [...map.keys()].sort((a, b) => a - b);
  const n = cps.length;
  const base = 0xE000;
  const remap = new Map();
  const glyphIds = new Uint16Array(n);
  for (let i = 0; i < n; i++) {
    remap.set(cps[i], base + i);
    glyphIds[i] = map.get(cps[i]);
  }
  // One real segment [base, base+n-1] using a glyphIdArray, plus the mandatory
  // 0xFFFF terminator segment.
  const segCount = 2;
  let pow = 1, entrySelector = 0;
  while (pow * 2 <= segCount) { pow *= 2; entrySelector++; }
  const searchRange = pow * 2;
  const rangeShift = segCount * 2 - searchRange;
  // subtable = header(14) + endCode(4) + pad(2) + startCode(4) + delta(4) + rangeOff(4) + glyphArray(2n)
  const subLen = 14 + 4 + 2 + 4 + 4 + 4 + 2 * n;
  const sub = new Uint8Array(subLen);
  let o = 0;
  wrU16(sub, o, 4); o += 2;            // format
  wrU16(sub, o, subLen); o += 2;       // length
  wrU16(sub, o, 0); o += 2;            // language
  wrU16(sub, o, segCount * 2); o += 2; // segCountX2
  wrU16(sub, o, searchRange); o += 2;
  wrU16(sub, o, entrySelector); o += 2;
  wrU16(sub, o, rangeShift); o += 2;
  // endCode
  wrU16(sub, o, base + n - 1); o += 2;
  wrU16(sub, o, 0xFFFF); o += 2;
  // reservedPad
  wrU16(sub, o, 0); o += 2;
  // startCode
  wrU16(sub, o, base); o += 2;
  wrU16(sub, o, 0xFFFF); o += 2;
  // idDelta
  wrU16(sub, o, 0); o += 2;            // real segment: glyph from array (delta 0)
  wrU16(sub, o, 1); o += 2;            // 0xFFFF segment -> gid 0
  // idRangeOffset: real segment points to glyphArray (2*segCount bytes ahead = 4)
  wrU16(sub, o, 4); o += 2;
  wrU16(sub, o, 0); o += 2;
  // glyphIdArray
  for (let i = 0; i < n; i++) { wrU16(sub, o, glyphIds[i]); o += 2; }
  // cmap table: version(2) + numTables(2) + one record(8) + subtable
  const total = 4 + 8 + subLen;
  const out = new Uint8Array(total);
  wrU16(out, 0, 0);   // version
  wrU16(out, 2, 1);   // numTables
  wrU16(out, 4, 3);   // platform: Windows
  wrU16(out, 6, 1);   // encoding: Unicode BMP
  wrU32(out, 8, 12);  // offset to subtable
  out.set(sub, 12);
  return { bytes: out, remap };
}

function tableChecksum(data) {
  const padded = data.length + ((4 - (data.length % 4)) % 4);
  let sum = 0;
  for (let o = 0; o < padded; o += 4) {
    let w = 0;
    for (let b = 0; b < 4; b++) w = (w << 8) | (data[o + b] || 0);
    sum = (sum + w) >>> 0;
  }
  return sum;
}

// Decode a WOFF font back to sfnt, rewriting its cmap as a single remapped
// format-4 subtable. Returns { sfnt, remap } where remap maps original
// codepoints to the BMP codepoints the embedded font now understands.
// Decode a WOFF to sfnt WITHOUT rebuilding the cmap (used for analysis only).
async function rawWoffToSfnt(woff) {
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
    let data = (len === origLen) ? woff.slice(off, off + origLen) : await inflateZlib(woff.slice(off, off + len));
    entries.push({ tag, checksum, data, origLen });
  }
  let dirOff = 12, dataOff = 12 + numTables * 16;
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

function extractTable(sfnt, tag) {
  const numT = (sfnt[4] << 8) | sfnt[5];
  for (let i = 0; i < numT; i++) {
    const d = 12 + i * 16;
    const t = String.fromCharCode(sfnt[d], sfnt[d+1], sfnt[d+2], sfnt[d+3]);
    if (t === tag) {
      const off = (sfnt[d+8]<<24)|(sfnt[d+9]<<16)|(sfnt[d+10]<<8)|sfnt[d+11];
      const len = (sfnt[d+12]<<24)|(sfnt[d+13]<<16)|(sfnt[d+14]<<8)|sfnt[d+15];
      return sfnt.slice(off, off + len);
    }
  }
  return null;
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
  let fontRemap = null;
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
  // Replace the cmap with a single remapped format-4 subtable and capture the
  // codepoint remap so the text layer can be translated to match.
  for (const en of entries) {
    const tagStr = String.fromCharCode(en.tag[0], en.tag[1], en.tag[2], en.tag[3]);
    if (tagStr === "cmap") {
      try {
        const res = buildRemappedCmap(en.data);
        if (res) {
          en.data = res.bytes;
          en.origLen = res.bytes.length;
          en.checksum = tableChecksum(res.bytes);
          fontRemap = res.remap;
        }
      } catch (e) {
        console.error("cmap remap failed:", e.message);
      }
    }
  }
  // Recompute total size (the new cmap can differ from the original) and lay
  // the tables out with 4-byte padding.
  let dirOff = 12;
  let dataOff = 12 + numTables * 16;
  const totalNeeded = dataOff + entries.reduce((a, en) => a + en.origLen + ((4 - (en.origLen % 4)) % 4), 0);
  const out = totalNeeded > sfnt.length ? new Uint8Array(totalNeeded) : sfnt;
  const odv = out === sfnt ? sdv : new DataView(out.buffer);
  if (out !== sfnt) {
    odv.setUint32(0, flavor);
    odv.setUint16(4, numTables);
    odv.setUint16(6, pow * 16);
    odv.setUint16(8, entrySelector);
    odv.setUint16(10, numTables * 16 - pow * 16);
  }
  for (const en of entries) {
    for (let j = 0; j < 4; j++) odv.setUint8(dirOff + j, en.tag[j]);
    odv.setUint32(dirOff + 4, en.checksum);
    odv.setUint32(dirOff + 8, dataOff);
    odv.setUint32(dirOff + 12, en.origLen);
    dirOff += 16;
    out.set(en.data, dataOff);
    dataOff += en.origLen;
    while (dataOff % 4) dataOff++;
  }
  return { sfnt: out, remap: fontRemap };
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

// Translate every PUA codepoint in `text` through the font's remap table so it
// resolves under the embedded font's remapped format-4 cmap.
// Negate every Y coordinate in an SVG path string. pdf-lib's drawSvgPath treats
// its input as SVG (y-down) and flips y to PDF (y-up); fontkit glyph paths are
// already y-up, so pre-negating y makes the net transform identity.
function negateSvgY(svg) {
  // Which argument indices (0-based) are Y values, per command letter.
  const yArgs = { M: [1], L: [1], C: [1, 3, 5], S: [1, 3], Q: [1, 3], T: [1], A: [5], m: [1], l: [1], c: [1, 3, 5], s: [1, 3], q: [1, 3], t: [1], a: [5] };
  const isYAll = { V: true, v: true };
  let out = "", cmd = null, argIdx = 0, i = 0;
  const isNum = (c) => /[\d.eE+\-]/.test(c);
  while (i < svg.length) {
    const ch = svg[i];
    if (/[a-zA-Z]/.test(ch)) { out += ch; cmd = ch; argIdx = 0; i++; continue; }
    if (ch === "," || ch === " " || ch === "\t" || ch === "\n") { out += ch; i++; continue; }
    let j = i;
    if (svg[j] === "-" || svg[j] === "+") j++;
    while (j < svg.length && isNum(svg[j])) {
      // a sign after an 'e' is part of the exponent; otherwise stop
      if ((svg[j] === "-" || svg[j] === "+") && svg[j - 1] !== "e" && svg[j - 1] !== "E") break;
      j++;
    }
    const numStr = svg.slice(i, j);
    const val = parseFloat(numStr);
    let negate = false;
    if (isYAll[cmd]) negate = true;
    else if (yArgs[cmd] && yArgs[cmd].includes(argIdx)) negate = true;
    out += negate ? String(-val) : numStr;
    argIdx++;
    i = j;
  }
  return out;
}

function remapText(text, remap) {
  if (!remap || !remap.size) return text;
  let out = "";
  for (const ch of text) {
    const cp = ch.codePointAt(0);
    const r = remap.get(cp);
    out += r != null ? String.fromCodePoint(r) : ch;
  }
  return out;
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
  doc.registerFontkit(fontkit);
  const font = await doc.embedFont(StandardFonts.HelveticaBold);

  // Embed the template's @font-face WOFF fonts (ff1..ffN) with remapped cmaps
  // so every PUA glyph resolves under fontkit. fontMap[fam] = { font, remap }.
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
        // Keep the ORIGINAL sfnt (no cmap rebuild — fontkit rejects rebuilt cmaps).
        // We embed it for metrics, and keep a fontkit Font + codepoint->gid map so
        // we can draw each PUA glyph's vector path directly (bypassing fontkit's
        // encodeText, which cannot resolve supplementary PUA codepoints).
        const rawSfnt = await rawWoffToSfnt(woff);
        const cmap = extractTable(rawSfnt, "cmap");
        const gidMap = collectCmapMappings(cmap);
        const pdfFont = await doc.embedFont(rawSfnt);
        const fkFont = fontkit.create(rawSfnt);
        fontMap[fam] = { pdfFont, fkFont, gidMap, upm: fkFont.unitsPerEm || 1000 };
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
        let text, entry = null;
        if (hasPua) {
          text = rawText.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");
          const ffCls = (cls.match(/\bff([0-9a-z]+)\b/) || [])[1];
          const fam = ffCls ? "ff" + ffCls : null;
          entry = fam ? fontMap[fam] : null;
        } else {
          text = rawText.replace(/[^\x20-\x7E\u00A1-\u00FF]/g, "");
        }
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

        if (hasPua) {
          // Draw each PUA glyph as a vector path. fontkit's encodeText cannot
          // resolve these (mostly supplementary PUA) codepoints, so we map each
          // codepoint to its glyph id ourselves (gidMap) and draw the glyph's
          // outline via pdf-lib's drawSvgPath, advancing by the glyph width.
          if (!entry || !entry.fkFont) continue;
          const { fkFont, gidMap, upm } = entry;
          const gScale = size / upm;
          let cx = baseLeft + tLeft;
          for (const ch of text) {
            const cp = ch.codePointAt(0);
            if (cp === 32) { cx += size * 0.25; continue; }
            const gid = gidMap.get(cp);
            if (gid == null) { cx += size * 0.2; continue; }
            try {
              const glyph = fkFont.getGlyph(gid);
              // Pre-negate y so pdf-lib's drawSvgPath (which flips y for SVG) draws
              // the fontkit (y-up) glyph upright; place the path's baseline at y.
              const svg = negateSvgY(glyph.path.toSVG());
              page.drawSvgPath(svg, { x: cx, y, scale: gScale, color });
              cx += (glyph.advanceWidth || upm * 0.5) * gScale;
            } catch (e) { cx += size * 0.2; }
          }
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
  doc.registerFontkit(fontkit);
  const ffRe = /@font-face\s*\{([^}]+)\}/g;
  let fm, results = [];
  while ((fm = ffRe.exec(head))) {
    const fam = (fm[1].match(/font-family:["']?([^"';]+)/) || [])[1];
    const b64 = (fm[1].match(/base64,([A-Za-z0-9+/=]+)/) || [])[1];
    if (!fam || !b64) continue;
    if (fam !== "ff2") continue; // fast probe: only the main Arabic font
    const r = { fam };
    try {
      const woff = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      // Use the RAW font (no cmap rebuild) to confirm fontkit uses the original cmap.
      const rawSfnt = await rawWoffToSfnt(woff);
      const cmap = extractTable(rawSfnt, "cmap");
      const all = collectCmapMappings(cmap);
      const bmpByGid = new Map();
      for (const [cp, gid] of all) if (cp <= 0xFFFF) bmpByGid.set(gid, cp);
      const sup = [];
      for (const [cp, gid] of all) {
        if (cp > 0xFFFF) sup.push({ cp: "0x" + cp.toString(16), gid, bmpAlt: bmpByGid.has(gid) ? "0x" + bmpByGid.get(gid).toString(16) : null });
      }
      r.supplementary = sup.slice(0, 40);
      r.supCount = sup.length;
      const f = await doc.embedFont(rawSfnt);
      r.embedded = true;
      const probe = (cp) => {
        try {
          const e = f.encodeText(String.fromCodePoint(cp));
          return Array.from(e).map(b => b.toString(16).padStart(2, "0")).join(" ");
        } catch (e) { return "ERR:" + e.message; }
      };
      r.encodeE603 = probe(0xE603);   // BMP PUA — should resolve in original cmap
      r.encodeF0209 = probe(0xF0209); // supplementary PUA — expected tofu in original
    } catch (e) {
      r.error = e.message;
    }
    results.push(r);
  }
  return results;
}