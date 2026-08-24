import { esc } from "./mscTemplate.ts";

// Blank Al-Fakhama (MEHDULLAH) template — no sample data baked in, so we only
// draw our own values on top of the printed grid.
export const MEHDULLAH_TEMPLATE_URL =
  "https://media.base44.com/files/public/6a5cef68337f5303ffc014f5/08416a837_MEHD_ULLAH_edited.html";

// Page 2 geometry. Rendered page is 892.98 x 1262.88 px = 793.76 x 1122.56 pt.
const SCALE = 1.125;
const PAGE_H_PT = 1122.560093;
const PAGE_W_PT = 793.76;
const pt = (px: number) => px / SCALE;
// pdf2htmlEX pages are sized in px on screen and pt in print, so all of our
// overlay positions are expressed as percentages of the page box.
const pctX = (x: number) => ((x / PAGE_W_PT) * 100).toFixed(4) + "%";
const pctY = (y: number) => ((y / PAGE_H_PT) * 100).toFixed(4) + "%";

// Header blocks, measured in rendered px: [x, width]
const DRIVER_CELL = [2, 704];
const VEH_ROW_TOP = 284;
const VEH_COLS = [[2, 296], [302, 196], [502, 206]]; // plate, model, iqama
const TRIP_ROW_TOP = 456;
const TRIP_COLS = [[2, 196], [202, 146], [502, 381]]; // date, time, destination

// Passenger table — text baselines taken from the template's own row-number
// cells (pt from page bottom), and column boxes in pt.
const PAX_BASELINES = [
  563.52, 537.36, 511.2, 481.76, 455.6, 429.44,
  403.28, 377.12, 348.96, 321.6, 292.64, 265.28
];
const PAX_COLS_PT = {
  nat: [1.8, 264.8],
  id: [268.4, 174.2],
  name: [446.2, 309.3]
};

function text(
  xPx: number,
  topPx: number,
  wPx: number,
  hPx: number,
  value: string,
  sizePt: number
): string {
  if (!value) return "";
  return `<div style="position:absolute;left:${pctX(pt(xPx))};bottom:${pctY(PAGE_H_PT - pt(topPx + hPx))};width:${pctX(pt(wPx))};height:${pctY(pt(hPx))};z-index:9;display:flex;align-items:center;justify-content:center;font-family:Arial,Helvetica,sans-serif;font-size:${sizePt}pt;line-height:1;color:#000;white-space:nowrap;overflow:hidden"><span dir="ltr">${value}</span></div>`;
}

function rowText(col: number[], baselinePt: number, value: string, sizePt: number): string {
  if (!value) return "";
  return `<div style="position:absolute;left:${pctX(col[0])};bottom:${pctY(baselinePt - 2)};width:${pctX(col[1])};z-index:9;text-align:center;font-family:Arial,Helvetica,sans-serif;font-size:${sizePt}pt;line-height:1;color:#000;white-space:nowrap;overflow:hidden"><span dir="ltr">${value}</span></div>`;
}

function fmtDate(d: string): string {
  if (!d) return "";
  const dt = new Date(d + "T00:00:00");
  if (isNaN(dt.getTime())) return String(d);
  return `${String(dt.getDate()).padStart(2, "0")}/${String(dt.getMonth() + 1).padStart(2, "0")}/${dt.getFullYear()}`;
}

export function buildFromMehdullahTemplate(templateHtml: string, trip: any): string {
  const t = trip || {};
  const passengers = t.passengers || [];
  const d1 = (t.drivers || [])[0] || {};
  const from = esc(t.route_from || "");
  const to = esc(t.route_to || "");

  let cells = "";
  cells += text(DRIVER_CELL[0], 206, DRIVER_CELL[1], 30, esc(d1.name || ""), 15);
  cells += text(VEH_COLS[0][0], VEH_ROW_TOP, VEH_COLS[0][1], 29, esc(t.vehicle_plate || ""), 13);
  cells += text(VEH_COLS[1][0], VEH_ROW_TOP, VEH_COLS[1][1], 29, esc(t.car_model || ""), 13);
  cells += text(VEH_COLS[2][0], VEH_ROW_TOP, VEH_COLS[2][1], 29, esc(d1.iqama_no || ""), 13);
  cells += text(TRIP_COLS[0][0], TRIP_ROW_TOP, TRIP_COLS[0][1], 25, fmtDate(t.travel_date), 11);
  cells += text(TRIP_COLS[1][0], TRIP_ROW_TOP, TRIP_COLS[1][1], 25, esc(t.trip_time || ""), 11);
  cells += text(
    TRIP_COLS[2][0], TRIP_ROW_TOP, TRIP_COLS[2][1], 25,
    from && to ? `${from} TO ${to}` : "", 12
  );

  for (let i = 0; i < PAX_BASELINES.length; i++) {
    const p = passengers[i];
    if (!p) continue;
    const b = PAX_BASELINES[i];
    cells += rowText(PAX_COLS_PT.nat, b, esc(p.nationality || ""), 11);
    cells += rowText(PAX_COLS_PT.id, b, esc(p.id_number || ""), 11);
    cells += rowText(PAX_COLS_PT.name, b, esc(p.name || ""), 11);
  }

  let html = templateHtml;
  const p2Idx = html.indexOf('<div id="pf2"');
  if (p2Idx >= 0) {
    const before = html.slice(0, p2Idx);
    const after = html.slice(p2Idx).replace(/(<img\b[^>]*>)/, "$1" + cells);
    html = before + after;
  }

  const extraCss = `
<style>
#sidebar{display:none!important}
#page-container{left:0!important}
.loading-indicator{display:none!important}
@media screen{.pc{display:block!important;opacity:1!important}}
@media print{@page{size:A4;margin:0}html,body{margin:0}.pf{page-break-after:always}}
</style>`;
  html = html.replace("</head>", extraCss + "\n</head>");
  html = html.replace(
    /<title>[^<]*<\/title>/,
    `<title>${esc(t.trip_name || "Mehdullah Manifest")}</title>`
  );
  html = html.replace("<body>", "<body><!--b44-mehdullah-v4-->");
  return html;
}