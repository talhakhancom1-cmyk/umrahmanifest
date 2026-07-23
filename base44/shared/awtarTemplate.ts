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
  cells += cell(HEADER_COLS.driver, HEADER_BOTTOM, esc(d1.name || ""), 14);
  cells += cell(HEADER_COLS.plate, HEADER_BOTTOM, esc(t.vehicle_plate || ""), 14);
  cells += cell(HEADER_COLS.dest, HEADER_BOTTOM, from && to ? `${from} TO ${to}` : "", 13);
  cells += cell(HEADER_COLS.date, HEADER_BOTTOM, `${date}${time ? " " + time : ""}`, 13);

  for (let i = 0; i < Math.min(passengers.length, MAX_ROWS); i++) {
    const p = passengers[i] || {};
    const bottom = ROW1_BOTTOM - i * ROW_STEP;
    cells += cell(COLS.name, bottom, esc(p.name || ""), 13);
    cells += cell(COLS.id, bottom, esc(p.id_number || ""), 13);
    cells += cell(COLS.nat, bottom, esc(p.nationality || ""), 13);
  }

  // inject the cells into page 2's content container
  let html = templateHtml;
  const idx = html.indexOf('<div id="pf2"');
  if (idx >= 0) {
    const before = html.slice(0, idx);
    const after = html.slice(idx).replace(/(<div class="pc[^"]*">)/, `$1${cells}`);
    html = before + after;
  }

  const extraCss = `
<style>
#sidebar{display:none!important}
#page-container{left:0!important}
.loading-indicator{display:none!important}
@media screen{.pc{display:block!important;opacity:1!important}}
@media print{@page{size:A4;margin:0}}
</style>`;
  html = html.replace("</head>", extraCss + "\n</head>");
  html = html.replace("<title></title>", `<title>${esc(t.trip_name || "Trip Manifest")}</title>`);
  return html;
}