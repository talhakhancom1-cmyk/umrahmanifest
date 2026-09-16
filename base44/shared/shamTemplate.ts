// SHAM Transport, Travel & Tourism Co. manifest builder. 5 pages:
//   pf1 = Arabic road-transport contract (date, second party, route)
//   pf2 = trip sheet: date/destination/time, vehicle row, passengers 1–18
//   pf3 = passengers 19–41
//   pf4 = passengers 42–47 + stamp
//   pf5 = daily vehicle inspection log (driver, plate, date, time; all Sound ticked)
// Values are overlaid at measured page positions (percent of the page box so
// screen and print agree); baked sample values are covered or swapped in place.
import { esc } from "./mscTemplate.ts";
import { placeNameAr } from "./placeNamesAr.ts";

export const SHAM_TEMPLATE_URL =
  "https://media.base44.com/files/public/6a5cef68337f5303ffc014f5/00016e5db_Sham-Transport-Contract-17-03-20263.html";

// Rendered page geometry (px)
const PAGE_W = 893;
const PAGE_H = 1263;
const pct = (v: number, ref: number) => (v / ref * 100).toFixed(4) + "%";
const INK = "#1f2937";

// Baked sample values swapped in place (page 1 / pages 2+5)
const SAMPLE_DATE_SLASH = "17/03/2026";
const SAMPLE_DATE_SHORT = "17-Mar-26";

// ---- Page 1 (contract, RTL): value cells left 238–842 ----
const P1_CELL = { left: 54, width: 598 };
const P1_SECOND_PARTY = { top: 406, height: 34 };
const P1_FROM = { top: 545, height: 33 };
const P1_TO = { top: 584, height: 33 };

// ---- Page 2 ----
const P2_TIME = { left: 666, top: 244, width: 120 };
const VEH_ROW = { top: 382, height: 40 };
const VEH = {
  model: { left: 646, width: 193 },
  plate: { left: 472, width: 170 },
  driver: { left: 251, width: 217 },
  iqama: { left: 54, width: 193 }
};
// Passenger table columns (same on pages 2–4)
const COL = {
  name: { left: 432, width: 351 },
  id: { left: 243, width: 185 },
  nat: { left: 54, width: 185 }
};
const ROW_PITCH = 38.75;
const ROW_H = 38;
// First row top per page and how many rows that page holds
const PAGES = [
  { id: "pf2", firstTop: 505, rows: 18 },
  { id: "pf3", firstTop: 277, rows: 23 },
  { id: "pf4", firstTop: 277, rows: 6 }
];
export const SHAM_MAX_ROWS = 47;

// ---- Page 5 (inspection log header row) ----
const P5_ROW = { top: 254, height: 36 };
const P5 = {
  driver: { left: 622, width: 217 },
  plate: { left: 432, width: 186 },
  time: { left: 54, width: 185 }
};

function fmtSlash(d: string): string {
  if (!d) return "";
  const dt = new Date(d + "T00:00:00");
  if (isNaN(dt.getTime())) return String(d);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(dt.getDate())}/${p(dt.getMonth() + 1)}/${dt.getFullYear()}`;
}

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function fmtShort(d: string): string {
  if (!d) return "";
  const dt = new Date(d + "T00:00:00");
  if (isNaN(dt.getTime())) return String(d);
  return `${String(dt.getDate()).padStart(2, "0")}-${MON[dt.getMonth()]}-${String(dt.getFullYear()).slice(2)}`;
}

// Text box vertically centred in a cell band; squeezed if too long.
function box(col: { left: number; width: number }, band: { top: number; height: number }, text: string, size = 15, align = "center"): string {
  const s = String(text || "");
  if (!s) return "";
  const est = s.length * size * 0.6;
  const avail = col.width * 0.92;
  const sx = est > avail ? (avail / est).toFixed(3) : "1";
  const lineH = size * 1.2;
  const bottom = PAGE_H - (band.top + band.height / 2 + lineH / 2);
  return `<div style="position:absolute;left:${pct(col.left, PAGE_W)};bottom:${pct(bottom, PAGE_H)};width:${pct(col.width, PAGE_W)};` +
    `text-align:${align};white-space:nowrap;line-height:${lineH}px;transform:scaleX(${sx});transform-origin:center center;` +
    `font-family:Arial,Helvetica,sans-serif;font-weight:700;font-size:${size}px;color:${INK};z-index:9">${s}</div>`;
}

function cover(col: { left: number; width: number }, band: { top: number; height: number }): string {
  return `<div style="position:absolute;left:${pct(col.left, PAGE_W)};bottom:${pct(PAGE_H - band.top - band.height, PAGE_H)};` +
    `width:${pct(col.width, PAGE_W)};height:${pct(band.height, PAGE_H)};background:#fff;z-index:8"></div>`;
}

// Inject overlay markup into a page's .pc container (on top of the background image)
function inject(html: string, pageId: string, overlay: string): string {
  if (!overlay) return html;
  const idx = html.indexOf('<div id="' + pageId + '"');
  if (idx < 0) return html;
  const before = html.slice(0, idx);
  const after = html.slice(idx).replace(/(<div class="pc[^"]*">)/,
    `$1<div style="position:absolute;left:0;bottom:0;width:100%;height:100%;z-index:9">${overlay}</div>`);
  return before + after;
}

export function buildFromShamTemplate(templateHtml: string, trip: any): string {
  const t = trip || {};
  const passengers = t.passengers || [];
  const drivers = t.drivers || [];
  const d1 = drivers[0] || {};
  const d2 = drivers[1] || {};
  const dateSlash = fmtSlash(t.travel_date);
  const dateShort = fmtShort(t.travel_date);
  const time = esc(t.trip_time || "");
  const fromEn = esc(String(t.route_from || "").replace(/_/g, " "));
  const toEn = esc(String(t.route_to || "").replace(/_/g, " "));
  const fromAr = esc(placeNameAr(t.route_from));
  const toAr = esc(placeNameAr(t.route_to));
  const driverNames = esc([d1.name, d2.name].filter(Boolean).join(" / "));
  const iqamas = esc([d1.iqama_no, d2.iqama_no].filter(Boolean).join(" / "));
  const plate = esc(t.vehicle_plate || "");
  const carModel = esc(t.car_model || "");
  const secondParty = d1.name
    ? `${esc(d1.name)} WITH ${passengers.length} PASSENGERS`
    : esc(t.second_party_name || "");

  let html = templateHtml;

  // ---- In-place swaps of baked sample values ----
  if (dateSlash) html = html.split(SAMPLE_DATE_SLASH).join(dateSlash);
  if (dateShort) html = html.split(SAMPLE_DATE_SHORT).join(dateShort);
  if (fromEn || toEn) {
    html = html.replace(/<span class="fc3">JUBAIL T[\s\S]*?RETURN<\/span>/,
      `<span class="fc3">${(fromEn + " TO " + toEn).toUpperCase()}</span>`);
  }
  if (time) {
    html = html.replace(/(<div class="t m0 xa7 h3 y132 [^"]*">TIME:)(<\/div>)/,
      `$1<span class="_ _e"> </span><span class="fc3">${time}</span>$2`);
  }

  // ---- Page 1: second party + route (cover baked Arabic samples) ----
  let ov1 = "";
  if (secondParty) ov1 += cover(P1_CELL, P1_SECOND_PARTY) + box(P1_CELL, P1_SECOND_PARTY, secondParty, 14);
  if (fromAr) ov1 += cover(P1_CELL, P1_FROM) + box(P1_CELL, P1_FROM, fromAr, 14);
  if (toAr) ov1 += cover(P1_CELL, P1_TO) + box(P1_CELL, P1_TO, toAr, 14);
  html = inject(html, "pf1", ov1);

  // ---- Page 2: vehicle row (model + plate samples covered) ----
  let ov2 = cover(VEH.model, VEH_ROW) + cover(VEH.plate, VEH_ROW);
  ov2 += box(VEH.model, VEH_ROW, carModel, 14);
  ov2 += box(VEH.plate, VEH_ROW, plate, 14);
  ov2 += box(VEH.driver, VEH_ROW, driverNames, 13);
  ov2 += box(VEH.iqama, VEH_ROW, iqamas, 13);

  // ---- Passenger rows across pages 2–4 ----
  const overlays: Record<string, string> = { pf2: ov2, pf3: "", pf4: "" };
  let idx = 0;
  for (const pg of PAGES) {
    for (let r = 0; r < pg.rows && idx < passengers.length; r++, idx++) {
      const p = passengers[idx] || {};
      const band = { top: pg.firstTop + r * ROW_PITCH, height: ROW_H };
      overlays[pg.id] += box(COL.name, band, esc(p.name || ""), 14);
      overlays[pg.id] += box(COL.id, band, esc(p.id_number || ""), 14);
      overlays[pg.id] += box(COL.nat, band, esc(p.nationality || ""), 14);
    }
  }
  for (const pg of PAGES) html = inject(html, pg.id, overlays[pg.id]);

  // ---- Page 5: inspection header row ----
  let ov5 = cover(P5.plate, P5_ROW);
  ov5 += box(P5.driver, P5_ROW, esc(d1.name || ""), 14);
  ov5 += box(P5.plate, P5_ROW, plate, 14);
  ov5 += box(P5.time, P5_ROW, time, 14);
  html = inject(html, "pf5", ov5);

  // ---- CSS overrides (print-safe, A4) ----
  const extraCss = `
<style>
#sidebar{display:none!important}
#page-container{left:0!important}
.loading-indicator{display:none!important}
.t{overflow:visible!important}
@media screen{.pc{display:block!important;opacity:1!important}}
@media print{@page{size:A4;margin:0}html,body{margin:0}.pf{page-break-after:always}}
</style>`;
  html = html.replace("</head>", extraCss + "\n</head>");
  html = html.replace("<title></title>", `<title>${esc(t.trip_name || "Trip Manifest")}</title>`);
  html = html.replace("<body>", "<body><!--b44-sham-v1-->");
  return html;
}