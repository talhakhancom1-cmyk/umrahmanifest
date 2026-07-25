// Builds the trip document from the Awtar Al-Fakhama blank-form template.
// All static layout (Arabic labels, table lines, stamp) lives in the page
// background images; the text layer is invisible selection text. Dynamic
// values are overlaid as absolutely-positioned "b44-cell" divs at measured
// table positions — the PDF builder draws these cells too.
import { esc, fmtDate } from "./mscTemplate.ts";

export const AWTAR_TEMPLATE_URL =
  "https://media.base44.com/files/public/6a5cef68337f5303ffc014f5/311bd0e8d______compressedpdf2.html";

// Page 2 geometry (px, bottom-up, page 893.25 x 1263.37)
const HEADER_BOTTOM = 914;
const HEADER_COLS = {
  driver: [594, 192],
  plate: [450, 141],
  dest: [303, 144],
  date: [137, 163]
};
const ROW1_BOTTOM = 864.5;
const ROW_STEP = 20.2576;
const MAX_ROWS = 25;
const COLS = {
  name: [437, 281],
  id: [303, 131],
  nat: [141, 158]
};

// Page 3 (inspection log) geometry: header row + driver-name declaration line
const P3_ROW_BOTTOM = 896;
const P3_COLS = {
  driver: [641, 190],
  plate: [446, 190],
  date: [251, 190],
  time: [56, 190]
};
const P3_SIGN_NAME = [520, 250]; // next to "إسم السائق :" at the bottom
const P3_SIGN_BOTTOM = 134;

function cell(col, bottom, text, fontSize) {
  return `<div class="b44-cell" style="position:absolute;left:${col[0]}px;bottom:${bottom}px;width:${col[1]}px;` +
    `text-align:center;font-family:Arial,Helvetica,sans-serif;font-weight:700;font-size:${fontSize}px;color:#000;z-index:9">${text}</div>`;
}

export function buildFromAwtarTemplate(templateHtml, trip) {
  const t = trip || {};
  const date = fmtDate(t.travel_date);
  const time = esc(t.trip_time || "");
  const from = esc((t.route_from || "").toUpperCase());
  const to = esc((t.route_to || "").toUpperCase());
  const d1 = (t.drivers || [])[0] || {};
  const passengers = t.passengers || [];

  let cells = "";
  cells += cell(HEADER_COLS.driver, HEADER_BOTTOM + 1, esc(d1.name || ""), 11);
  cells += cell(HEADER_COLS.plate, HEADER_BOTTOM + 1, esc(t.vehicle_plate || ""), 11);
  cells += cell(HEADER_COLS.dest, HEADER_BOTTOM + 1, from && to ? `${from} TO ${to}` : "", 10);
  cells += cell(HEADER_COLS.date, HEADER_BOTTOM + 1, `${date}${time ? " " + time : ""}`, 10);

  for (let i = 0; i < Math.min(passengers.length, MAX_ROWS); i++) {
    const p = passengers[i] || {};
    const bottom = ROW1_BOTTOM + 2.5 - i * ROW_STEP;
    cells += cell(COLS.name, bottom, esc(p.name || ""), 11);
    cells += cell(COLS.id, bottom, esc(p.id_number || ""), 11);
    cells += cell(COLS.nat, bottom, esc(p.nationality || ""), 11);
  }

  // page 3: inspection log header row + driver declaration line
  let cells3 = "";
  cells3 += cell(P3_COLS.driver, P3_ROW_BOTTOM, esc(d1.name || ""), 11);
  cells3 += cell(P3_COLS.plate, P3_ROW_BOTTOM, esc(t.vehicle_plate || ""), 11);
  cells3 += cell(P3_COLS.date, P3_ROW_BOTTOM, date, 11);
  cells3 += cell(P3_COLS.time, P3_ROW_BOTTOM, time, 11);
  cells3 += cell(P3_SIGN_NAME, P3_SIGN_BOTTOM, esc(d1.name || ""), 12);

  // inject the cells into each page's content container
  let html = templateHtml;
  const inject = (pageId, pageCells) => {
    const idx = html.indexOf(`<div id="${pageId}"`);
    if (idx >= 0) {
      const before = html.slice(0, idx);
      const after = html.slice(idx).replace(/(<div class="pc[^"]*">)/, `$1${pageCells}`);
      html = before + after;
    }
  };
  inject("pf2", cells);
  inject("pf3", cells3);

  const extraCss = `
<style>
#sidebar{display:none!important}
#page-container{left:0!important}
.loading-indicator{display:none!important}
@media screen{.pc{display:block!important;opacity:1!important}}
@media print{@page{size:A4;margin:0}.pf{width:210mm!important;height:297mm!important;overflow:hidden;page-break-after:always;page-break-inside:avoid}.pf:last-child{page-break-after:auto}.pc{transform:scale(0.8885);transform-origin:0 0;width:112.55%!important;height:112.55%!important}}
</style>`;
  html = html.replace("</head>", extraCss + "\n</head>");
  html = html.replace("<title></title>", `<title>${esc(t.trip_name || "Trip Manifest")}</title>`);
  return html;
}