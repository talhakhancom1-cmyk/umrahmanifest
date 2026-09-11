// Al Talab Al-Momaies Transport Company manifest builder.
// Uses the company's BLANK pdf2htmlEX template (no sample data baked in) and
// injects each value as a positioned text div. 2 pages:
//   pf1 = English manifest (driver, vehicle, passengers, date, times)
//   pf2 = Arabic contract (second party, route, date)
import { esc } from "./mscTemplate.ts";
import { placeNameAr } from "./placeNamesAr.ts";

export const TALAB_TEMPLATE_URL =
  "https://media.base44.com/files/public/6a5cef68337f5303ffc014f5/272c894dd_trip_148487_company_apdf.html";

// pdf2htmlEX puts positions in x/y classes (px on screen, pt in print), so we
// only ever position with the template's own classes — never inline pixels.
const VAL_COL2 = "x7";   // value column beside the left-hand labels
const VAL_COL4 = "x2a";  // value column beside the right-hand labels

// Header rows (label y-classes on page 1)
const ROW_DRIVER = "yf";   // Driver Name:        | Residency Number:
const ROW_DRIVER2 = "y10"; // Second Driver Name:
const ROW_VEHICLE = "y11"; // Type of Vehicle:    | Registration Number:
const ROW_TOTALS = "y12";  // Total Passengers:   | Date:
const ROW_TIMES = "y13";   // Start Time:         | End Time:

// Passenger table: 10 rows, y-class per row (row numbers already printed)
const PAX_ROW_Y = ["y5", "y6", "y7", "y8", "y9", "ya", "yb", "yc", "yd", "ye"];
// Passenger column x-classes (taken from the column headers)
const PAX_COL = {
  name: "x1",
  id: "x8",
  nationality: "xb",
  from: "xd",
  to: "xe"
};

// Sample values baked into the Arabic contract page
const SAMPLE_DATE_AR = "23-08-2026";
const SAMPLE_SECOND_PARTY = "Umar";

// Arabic contract page: the route lines are blank in the template, so we place
// the values just left of each label (RTL page, coordinates from the template).
const AR_FROM = { left: 700, bottom: 800.4 };  // النقل من :
const AR_TO = { left: 700, bottom: 764.4 };    // وصولاً إلى :

function arCell(pos: { left: number; bottom: number }, value: string): string {
  if (!value) return "";
  return `<div class="t m0 ha ff2 fs1 fc1 sc0 ls0 ws0" style="left:${pos.left}px;bottom:${pos.bottom}px"><span dir="ltr">${value}</span></div>`;
}

// A positioned value div using the template's own font + geometry classes.
function cell(x: string, y: string, value: string, fits = 0): string {
  if (value === "" || value == null) return "";
  const inner = fits ? fit(value, fits) : value;
  return `<div class="t m0 ${x} h4 ${y} ff1 fs1 fc1 sc0 ls0 ws0">${inner}</div>`;
}

// English date: YYYY-MM-DD (as stored on the trip)
function fmtDateEn(d: string): string {
  if (!d) return "";
  const dt = new Date(d + "T00:00:00");
  if (isNaN(dt.getTime())) return String(d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}

// Arabic date: DD-MM-YYYY
function fmtDateAr(d: string): string {
  if (!d) return "";
  const dt = new Date(d + "T00:00:00");
  if (isNaN(dt.getTime())) return String(d);
  return `${String(dt.getDate()).padStart(2, "0")}-${String(dt.getMonth() + 1).padStart(2, "0")}-${dt.getFullYear()}`;
}

// Squeeze a value horizontally so long text stays inside its cell.
function fit(text: string, fits: number): string {
  const s = String(text);
  if (s.length <= fits) return s;
  const sx = (fits / s.length).toFixed(3);
  return `<span style="display:inline-block;white-space:nowrap;transform:scaleX(${sx});transform-origin:left center">${s}</span>`;
}

export function buildFromTalabTemplate(templateHtml: string, trip: any): string {
  const t = trip || {};
  const passengers = t.passengers || [];
  const drivers = t.drivers || [];
  const d1 = drivers[0] || {};
  const d2 = drivers[1] || {};
  const dateEn = fmtDateEn(t.travel_date);
  const dateAr = fmtDateAr(t.travel_date);
  const secondParty = esc(t.second_party_name || "");
  const routeFrom = esc(placeNameAr(t.route_from));
  const routeTo = esc(placeNameAr(t.route_to));
  let html = templateHtml;

  // ---- Arabic contract page ----
  const dateLine = dateAr ? (t.trip_time ? `${dateAr} - ${esc(t.trip_time)}` : dateAr) : SAMPLE_DATE_AR;
  html = html.split(SAMPLE_DATE_AR).join(dateLine);
  html = html.split(SAMPLE_SECOND_PARTY).join(secondParty || " ");

  const arCells = arCell(AR_FROM, routeFrom) + arCell(AR_TO, routeTo);
  const p2Idx = html.indexOf('<div id="pf2"');
  if (p2Idx >= 0 && arCells) {
    const before = html.slice(0, p2Idx);
    const after = html.slice(p2Idx).replace(/(<img\b[^>]*>)/, "$1" + arCells);
    html = before + after;
  }

  // ---- Page 1 values ----
  let cells = "";
  cells += cell(VAL_COL2, ROW_DRIVER, esc(d1.name || "—"), 26);
  cells += cell(VAL_COL4, ROW_DRIVER, esc(d1.iqama_no || "—"));
  if (d2.name) cells += cell(VAL_COL2, ROW_DRIVER2, esc(d2.name), 26);
  cells += cell(VAL_COL2, ROW_VEHICLE, esc(t.car_model || "—"), 20);
  cells += cell(VAL_COL4, ROW_VEHICLE, esc(t.vehicle_plate || "—"), 14);
  cells += cell(VAL_COL2, ROW_TOTALS, String(passengers.length));
  cells += cell(VAL_COL4, ROW_TOTALS, dateEn);
  cells += cell(VAL_COL2, ROW_TIMES, esc(t.trip_time || "—"), 14);

  // ---- Page 1 passenger rows (up to 10) ----
  for (let i = 0; i < PAX_ROW_Y.length; i++) {
    const p = passengers[i];
    if (!p || !p.name) continue;
    const y = PAX_ROW_Y[i];
    cells += cell(PAX_COL.name, y, esc(p.name), 16);
    cells += cell(PAX_COL.id, y, esc(p.id_number || ""), 14);
    cells += cell(PAX_COL.nationality, y, esc(p.nationality || ""), 10);
    cells += cell(PAX_COL.from, y, routeFrom, 8);
    cells += cell(PAX_COL.to, y, routeTo, 8);
  }

  // Injected right after the page background image so the values sit on top.
  const p1Idx = html.indexOf('<div id="pf1"');
  if (p1Idx >= 0) {
    const before = html.slice(0, p1Idx);
    const after = html.slice(p1Idx).replace(/(<img\b[^>]*>)/, "$1" + cells);
    html = before + after;
  }

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
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${esc(t.trip_name || "Trip Manifest")}</title>`);
  html = html.replace("<body>", "<body><!--b44-talab-v3-->");

  return html;
}