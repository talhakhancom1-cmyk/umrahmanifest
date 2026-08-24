import { esc } from "./mscTemplate.ts";

export const MEHDULLAH_TEMPLATE_URL =
  "https://media.base44.com/files/public/6a5cef68337f5303ffc014f5/c3dd01e3f_MEHDULLAH.html";

// Al-Fakhama (MEHDULLAH) template. Its text is stored with private-use glyph
// encoding, so sample values can't be string-replaced. Instead we white-mask
// each data cell on page 2 and draw our own text on top, using coordinates
// measured from the rendered page (893 x 1263 px) converted to the template's
// own pt coordinate system.
const SCALE = 1.125;
const PAGE_H_PT = 1122.666667;
const pt = (px: number) => px / SCALE;

// Page-2 data cells, in rendered px: [x, width]
const DRIVER_CELL = [2, 704];
const VEH_ROW_TOP = 284;
const VEH_COLS = [[2, 296], [302, 196], [502, 206], [712, 171]]; // plate, model, iqama, mobile
const TRIP_ROW_TOP = 456;
const TRIP_COLS = [[2, 196], [202, 146], [352, 146], [502, 381]]; // date, time, trip no, destination
const PAX_ROW_TOPS = [609, 638, 668, 700, 728, 759, 787, 818, 849, 881, 911, 941];
const PAX_COLS = { nat: [2, 296], id: [302, 196], name: [502, 348] };

function mask(xPx: number, topPx: number, wPx: number, hPx: number): string {
  return `<div style="position:absolute;left:${pt(xPx)}pt;bottom:${PAGE_H_PT - pt(topPx + hPx)}pt;width:${pt(wPx)}pt;height:${pt(hPx)}pt;background:#fff;z-index:8"></div>`;
}

function text(
  xPx: number,
  topPx: number,
  wPx: number,
  hPx: number,
  value: string,
  sizePt: number
): string {
  if (!value) return "";
  return `<div style="position:absolute;left:${pt(xPx)}pt;bottom:${PAGE_H_PT - pt(topPx + hPx)}pt;width:${pt(wPx)}pt;height:${pt(hPx)}pt;z-index:9;display:flex;align-items:center;justify-content:center;font-family:Arial,Helvetica,sans-serif;font-size:${sizePt}pt;line-height:1;color:#000;white-space:nowrap;overflow:hidden"><span dir="ltr">${value}</span></div>`;
}

function cell(
  col: number[],
  topPx: number,
  hPx: number,
  value: string,
  sizePt: number
): string {
  return mask(col[0], topPx, col[1], hPx) + text(col[0], topPx, col[1], hPx, value, sizePt);
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
  // Driver name
  cells += mask(DRIVER_CELL[0], 206, DRIVER_CELL[1], 30);
  cells += text(DRIVER_CELL[0], 206, DRIVER_CELL[1], 30, esc(d1.name || ""), 15);
  // Vehicle row: plate, model, iqama, mobile (mobile left blank)
  cells += cell(VEH_COLS[0], VEH_ROW_TOP, 29, esc(t.vehicle_plate || ""), 13);
  cells += cell(VEH_COLS[1], VEH_ROW_TOP, 29, esc(t.car_model || ""), 13);
  cells += cell(VEH_COLS[2], VEH_ROW_TOP, 29, esc(d1.iqama_no || ""), 13);
  cells += mask(VEH_COLS[3][0], VEH_ROW_TOP, VEH_COLS[3][1], 29);
  // Date / time / trip no / destination
  cells += cell(TRIP_COLS[0], TRIP_ROW_TOP, 25, fmtDate(t.travel_date), 11);
  cells += cell(TRIP_COLS[1], TRIP_ROW_TOP, 25, esc(t.trip_time || ""), 11);
  cells += mask(TRIP_COLS[2][0], TRIP_ROW_TOP, TRIP_COLS[2][1], 25);
  cells += cell(TRIP_COLS[3], TRIP_ROW_TOP, 25, from && to ? `${from} TO ${to}` : "", 12);
  // Passenger rows
  for (let i = 0; i < PAX_ROW_TOPS.length; i++) {
    const top = PAX_ROW_TOPS[i];
    const p = passengers[i] || {};
    cells += cell(PAX_COLS.nat, top, 26, esc(p.nationality || ""), 11);
    cells += cell(PAX_COLS.id, top, 26, esc(p.id_number || ""), 11);
    cells += cell(PAX_COLS.name, top, 26, esc(p.name || ""), 11);
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
/* Sample data baked into page 2's text layer (driver/vehicle values, trip
   values and the 12 passenger rows) — removed so only our data shows. */
#i41,#i35,#i33,#i25,#i24,#i23,#i22,#i21,#i20,#i19,#i18,#i17,#i16,#i15{display:none!important}
@media screen{.pc{display:block!important;opacity:1!important}}
@media print{@page{size:A4;margin:0}html,body{margin:0}.pf{page-break-after:always}}
</style>`;
  html = html.replace("</head>", extraCss + "\n</head>");
  html = html.replace(
    /<title>[^<]*<\/title>/,
    `<title>${esc(t.trip_name || "Mehdullah Manifest")}</title>`
  );
  html = html.replace("<body>", "<body><!--b44-mehdullah-v2-->");
  return html;
}