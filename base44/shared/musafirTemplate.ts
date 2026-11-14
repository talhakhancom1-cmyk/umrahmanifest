// Almusafir Almuatamad (المسافر المعتمد) — 3-page contract template (pdf2htmlEX).
//   pf1 = contract: trip values, driver block, guest row, second party
//   pf2 = passenger list table (7 rows/page, repeated for longer groups)
//   pf3 = contract terms (untouched)
// Driver details fall back to the baked-in ones when the trip has no driver.
import { esc } from "./mscTemplate.ts";

export const MUSAFIR_TEMPLATE_URL =
  "https://base44.app/api/apps/6a5cef68337f5303ffc014f5/files/mp/public/6a5cef68337f5303ffc014f5/00fbad5d3_newco_raw.html";

const BAKED_DRIVER = {
  name: "MUHAMMAD SHAFI NABI GUL",
  iqama: "2577872621",
  phone: "",
  plate: "3302 EXA"
};

// sample name inside the "الطرف الثاني" run of the contract body (Mina Gula)
const SAMPLE_NAME_GLYPHS =
  "\ueba1\uec35\uec4b\uebda\ue603\ueb8a\uec8a\uec41\uebda";

// driver photo printed in the empty frame of the driver column (page 1)
const DRIVER_PHOTO_URL =
  "https://base44.app/api/apps/6a5cef68337f5303ffc014f5/files/mp/public/6a5cef68337f5303ffc014f5/dd4288a0b_musafir_driver.jpg";

const TABLE_TOP = 945;   // first body row baseline sits below the grey header band
const TABLE_BOTTOM = 685; // and ends above the footer

// Column centres read off the template's own header labels:
//   #  ≈ 820 · guest name ≈ 590 · nationality ≈ 360 · id/passport ≈ 166
const COL = {
  serial: { left: 790, width: 60 },
  name: { left: 430, width: 320 },
  nationality: { left: 290, width: 140 },
  id: { left: 66, width: 200 }
};

function cssVal(html: string, kind: string, name: string) {
  const i = html.indexOf("." + kind + name + "{");
  if (i < 0) return null;
  const e = html.indexOf("}", i);
  const m = /:\s*(-?[\d.]+)px/.exec(html.slice(i, e + 1));
  return m ? parseFloat(m[1]) : null;
}

function classTok(cls: string, kind: string) {
  const m = new RegExp("(?:^|\\s)" + kind + "([\\w-]+)").exec(cls);
  return m ? m[1] : "";
}

type Run = { start: number; bodyStart: number; bodyEnd: number; end: number; x: number; y: number };

// Locates every absolutely positioned text run of a page.
function scanRuns(page: string, tpl: string): Run[] {
  const runs: Run[] = [];
  let i = 0;
  while (true) {
    const p = page.indexOf('<div class="t ', i);
    if (p < 0) break;
    const gt = page.indexOf(">", p);
    const cls = page.slice(p + 14, gt);
    let depth = 1, j = gt + 1;
    while (depth > 0) {
      const a = page.indexOf("<div", j);
      const b = page.indexOf("</div>", j);
      if (b < 0) { j = page.length; break; }
      if (a >= 0 && a < b) { depth++; j = a + 5; } else { depth--; j = b + 6; }
    }
    const bodyEnd = page.lastIndexOf("</div>", j - 1);
    runs.push({
      start: p,
      bodyStart: gt + 1,
      bodyEnd,
      end: j,
      x: cssVal(tpl, "x", classTok(cls, "x")) ?? -1,
      y: cssVal(tpl, "y", classTok(cls, "y")) ?? -1
    });
    i = j;
  }
  return runs;
}

function fit(text: string, chars: number) {
  if (text.length <= chars) return text;
  const k = Math.max(0.55, chars / text.length);
  return `<span style="display:inline-block;white-space:nowrap;transform:scaleX(${k.toFixed(3)});transform-origin:right center">${text}</span>`;
}

// Generic value drawn where a sample run used to be.
function overlay(left: number, bottom: number, html: string, size = 18, width = 130, align = "center") {
  return `<div class="b44-cell" style="position:absolute;left:${left}px;bottom:${bottom}px;width:${width}px;` +
    `text-align:${align};font-size:${size}px;line-height:1;white-space:nowrap;` +
    `font-family:Arial,Helvetica,sans-serif;font-weight:700;color:#000;z-index:9">${html}</div>`;
}

// Removes the sample runs listed in `targets` ("left:bottom" -> replacement html)
function patch(page: string, tpl: string, targets: Record<string, string>) {
  let out = "";
  let i = 0;
  for (const r of scanRuns(page, tpl)) {
    out += page.slice(i, r.start);
    const key = Math.round(r.x) + ":" + Math.round(r.y);
    if (targets[key] != null) {
      if (targets[key]) out += targets[key];
      delete targets[key];
    } else {
      out += page.slice(r.start, r.end);
    }
    i = r.end;
  }
  return out + page.slice(i);
}

// Groups the table body lines of the passenger page into row baselines.
function tableRows(page: string, tpl: string) {
  const ys = scanRuns(page, tpl)
    .filter((r) => r.y < TABLE_TOP && r.y > TABLE_BOTTOM)
    .map((r) => r.y)
    .sort((a, b) => b - a);
  const rows: number[] = [];
  for (const y of ys) if (!rows.length || rows[rows.length - 1] - y > 8) rows.push(y);
  return rows;
}

// Rebuilds the passenger page: sample rows removed, our passengers drawn in.
function fillListPage(page: string, tpl: string, pax: any[], startIndex = 0) {
  const rows = tableRows(page, tpl);
  // drop every sample run inside the table body
  let out = "";
  let i = 0;
  for (const r of scanRuns(page, tpl)) {
    out += page.slice(i, r.start);
    if (!(r.y < TABLE_TOP && r.y > TABLE_BOTTOM)) out += page.slice(r.start, r.end);
    i = r.end;
  }
  page = out + page.slice(i);

  const offset = startIndex || 0;
  let grid = "";
  rows.forEach((y, idx) => {
    const p = pax[idx];
    if (!p) return;
    grid += overlay(COL.serial.left, y, String(offset + idx + 1), 13, COL.serial.width);
    grid += overlay(COL.name.left, y, fit(esc(String(p.name || "").toUpperCase()), 30), 15, COL.name.width);
    grid += overlay(COL.nationality.left, y, fit(esc(String(p.nationality || "").toUpperCase()), 13), 13, COL.nationality.width);
    grid += overlay(COL.id.left, y, fit(esc(String(p.id_number || "")), 13), 13, COL.id.width);
  });
  if (!grid) return page;
  return page.replace(/(<div class="pc[^"]*">)/, `$1<div style="position:absolute;left:0;top:0;width:100%;height:100%;z-index:9">${grid}</div>`);
}

export function buildFromMusafirTemplate(templateHtml: string, trip: any): string {
  const t = trip || {};
  const pax = t.passengers || [];
  const drv = (t.drivers && t.drivers[0]) || {};
  const dt = new Date((t.travel_date || "") + "T00:00:00");
  const pd = (n: number) => String(n).padStart(2, "0");
  const iso = isNaN(dt.getTime())
    ? ""
    : `${dt.getFullYear()}-${pd(dt.getMonth() + 1)}-${pd(dt.getDate())}`;
  const place = (s: any) => esc(String(s || "").replace(/_/g, " ").trim().toUpperCase());
  const from = place(t.route_from);
  const to = place(t.route_to);
  const time = esc(t.trip_time || "");
  const driverName = esc(String(drv.name || BAKED_DRIVER.name).toUpperCase());
  const iqama = esc(String(drv.iqama_no || BAKED_DRIVER.iqama));
  const phone = esc(String(drv.phone || BAKED_DRIVER.phone));
  const plate = esc(String(t.vehicle_plate || drv.vehicle_plate || BAKED_DRIVER.plate).toUpperCase());
  const leaderName = esc(String(((t.passengers || [])[0] || {}).name || "").trim().toUpperCase());
  const paxCount = pax.length ? String(pax.length) : "";

  const html = templateHtml.replace(/<script[\s\S]*?<\/script>/g, "");
  const parts = html.split(/(<div id="pf[123]")/);
  let head = parts[0];
  let p1 = (parts[1] || "") + (parts[2] || "");
  const p2raw = (parts[3] || "") + (parts[4] || "");
  const p3 = (parts[5] || "") + (parts[6] || "");

  // ---- page 1: trip values ----
  const targets: Record<string, string> = {};
  if (from) targets["488:953"] = overlay(488, 953, from, 18, 130);
  if (to) targets["298:954"] = overlay(298, 954, to, 18, 130);
  if (iso) targets["57:976"] = overlay(57, 976, iso, 17, 120);
  if (time) targets["78:943"] = overlay(78, 943, time, 17, 120);

  if (driverName) {
    targets["727:839"] = overlay(650, 838, driverName, 15, 210);
    targets["677:839"] = "";
    targets["733:839"] = "";
  }
  if (iqama) targets["709:781"] = overlay(709, 781, iqama, 17, 140);
  if (phone) targets["709:718"] = overlay(709, 718, phone, 17, 140);
  if (plate) targets["706:656"] = overlay(706, 656, plate, 16, 150);

  const guestRow =
    (leaderName ? overlay(370, 647, leaderName, 17, 170) : "") +
    (paxCount ? overlay(30, 647, paxCount, 17, 110) : "");
  if (guestRow) targets["419:647"] = guestRow;
  p1 = patch(p1, html, targets);

  // ---- page 1: second party in the contract body ----
  if (leaderName) {
    p1 = p1.replace(SAMPLE_NAME_GLYPHS, "");
    p1 = p1.replace(/(<div class="pc[^"]*">)/,
      `$1${overlay(575, 391, leaderName, 17, 135, "right")}`);
  }

  // ---- page 1: driver photo in the empty frame of the driver column ----
  p1 = p1.replace(/(<div class="pc[^"]*">)/,
    `$1<img class="bi" style="position:absolute;left:700px;bottom:876px;width:112px;height:150px;` +
    `object-fit:cover;border:1px solid #000;z-index:9" src="${DRIVER_PHOTO_URL}">`);

  // ---- page 2: passenger list, one page per table (6 rows) ----
  const perPage = p2raw ? tableRows(p2raw, html).length : 6;
  const pages: string[] = [];
  const chunks = Math.max(1, Math.ceil(pax.length / perPage));
  for (let c = 0; c < chunks; c++) {
    pages.push(fillListPage(p2raw, html, pax.slice(c * perPage, (c + 1) * perPage), c * perPage));
  }

  const css = `
<style>
#sidebar{display:none!important}
#page-container{left:0!important}
.loading-indicator{display:none!important}
@media screen{.pc{display:block!important;opacity:1!important}}
@media print{@page{size:A4;margin:0}html,body{margin:0}.pf{page-break-after:always}}
</style>`;
  head = head
    .replace("</head>", css + "\n</head>")
    .replace("<title></title>", `<title>${esc(t.trip_name || "Trip Manifest")}</title>`);
  return head + p1 + pages.join("") + p3;
}