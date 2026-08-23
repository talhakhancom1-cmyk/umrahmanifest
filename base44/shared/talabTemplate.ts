// Al Talab Al-Momaies Transport Company manifest builder.
// Uses the company's pdf2htmlEX template and swaps each dynamic field
// in-place by its class string. 2 pages:
//   pf1 = English manifest (driver, vehicle, passengers, date, times)
//   pf2 = Arabic contract (second party, route, date)
import { esc } from "./mscTemplate.ts";

export const TALAB_TEMPLATE_URL =
  "https://media.base44.com/files/public/6a5cef68337f5303ffc014f5/c83e4c40d_trip_148487_company_a.html";

// ---- Page 1 (English manifest) field classes ----
// Each div holds label + value together, so we reconstruct the full line.
const DRIVER_RESIDENCY = "m0 x3 h3 y3 ff1 fs1 fc1 sc0 ls0 ws0";
const SECOND_DRIVER     = "m0 x3 h3 y4 ff1 fs1 fc1 sc0 ls0 ws0";
const VEHICLE_PLATE     = "m0 x3 h3 y5 ff1 fs1 fc1 sc0 ls0 ws0";
const PAX_COUNT_DATE    = "m0 x3 h3 y6 ff1 fs1 fc1 sc0 ls0 ws0";
const TIMES             = "m0 x3 h3 y7 ff1 fs1 fc1 sc0 ls0 ws0";

// ---- 10 passenger row classes (rows 1–10) ----
const PAX_ROWS = [
  "m0 x6 h3 ya ff2 fs1 fc2 sc0 ls0 ws0",
  "m0 x6 h3 yb ff2 fs1 fc2 sc0 ls0 ws0",
  "m0 x6 h3 yc ff2 fs1 fc2 sc0 ls0 ws0",
  "m0 x6 h3 yd ff2 fs1 fc2 sc0 ls0 ws0",
  "m0 x6 h3 ye ff2 fs1 fc2 sc0 ls0 ws0",
  "m0 x6 h3 yf ff2 fs1 fc2 sc0 ls0 ws0",
  "m0 x6 h3 y10 ff2 fs1 fc2 sc0 ls0 ws0",
  "m0 x6 h3 y11 ff2 fs1 fc2 sc0 ls0 ws0",
  "m0 x6 h3 y12 ff2 fs1 fc2 sc0 ls0 ws0",
  "m0 x7 h3 y13 ff2 fs1 fc2 sc0 ls0 ws0"
];

// Sample values baked into the template (replaced on the Arabic page)
const SAMPLE_DATE_AR = "23-08-2026";
const SAMPLE_ROUTE_TO = "Madinah";   // Arabic route-to label (passenger rows use "Madina")
const SAMPLE_ROUTE_FROM = "Jaddah"; // Arabic route-from label
const SAMPLE_SECOND_PARTY = "Umar";  // Arabic second-party name

// ---- Page 1 background raster masking ----
// The template page carries a full-page PNG of the ORIGINAL filled document,
// so the sample driver / plate / date / passenger rows keep showing through
// behind our text. We white out both table interiors and redraw the outer
// border + row separators, so only our values remain visible.
const PAGE_W = 893.25;
const PAGE_H = 1263;
const TABLE_LEFT = 24;
const TABLE_RIGHT = 876;

// Header table: 5 rows at .y7 (lowest) .. .y3, pitch from the y-class values.
const HDR_BOTTOM = 788.5875;
const HDR_PITCH = 39.825;
const HDR_ROWS = 5;

// Passenger table body: 10 rows at .y13 (lowest) .. .ya.
const PAX_BOTTOM = 288.834;
const PAX_PITCH = 35.325;
const PAX_ROW_COUNT = 10;

const pw = (v: number) => (v / PAGE_W * 100).toFixed(4) + "%";
const ph = (v: number) => (v / PAGE_H * 100).toFixed(4) + "%";

function maskedTable(bottom: number, pitch: number, rows: number): string {
  const left = TABLE_LEFT;
  const width = TABLE_RIGHT - TABLE_LEFT;
  const height = pitch * rows;
  const b = bottom - 5;
  let out =
    `<div style="position:absolute;left:${pw(left)};bottom:${ph(b)};width:${pw(width)};height:${ph(height)};` +
    `background:#fff;border:1px solid #111;box-sizing:border-box"></div>`;
  // row separators (skip the outermost, already drawn by the border)
  for (let i = 1; i < rows; i++) {
    out +=
      `<div style="position:absolute;left:${pw(left)};bottom:${ph(b + i * pitch)};width:${pw(width)};` +
      `height:1px;background:#111"></div>`;
  }
  return out;
}

function buildPage1Mask(): string {
  return (
    `<div class="b44-mask" style="position:absolute;left:0;top:0;width:100%;height:100%;z-index:2">` +
    maskedTable(HDR_BOTTOM, HDR_PITCH, HDR_ROWS) +
    maskedTable(PAX_BOTTOM, PAX_PITCH, PAX_ROW_COUNT) +
    `</div>`
  );
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Replace the inner content of the FIRST div matching a full class string.
function replaceDivInner(html: string, fullClass: string, newInner: string): string {
  const cls = escapeRegex(fullClass);
  return html.replace(
    new RegExp('(<div class="t ' + cls + '"[^>]*>)[\\s\\S]*?(</div>)'),
    "$1" + newInner + "$2"
  );
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

// Squeeze a value horizontally so long text stays inside its baked cell.
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
  const routeFrom = esc(t.route_from || "");
  const routeTo = esc(t.route_to || "");
  const carModel = esc(t.car_model || "");
  const plate = esc(t.vehicle_plate || "");
  const tripTime = esc(t.trip_time || "");
  const paxCount = passengers.length;
  let html = templateHtml;

  // ---- Arabic contract page FIRST (sample values are unique on that page
  //      once the English manifest divs are overwritten below) ----
  html = html.split(SAMPLE_DATE_AR).join(dateAr);
  html = html.split(SAMPLE_ROUTE_TO).join(routeTo || SAMPLE_ROUTE_TO);
  html = html.split(SAMPLE_ROUTE_FROM).join(routeFrom || SAMPLE_ROUTE_FROM);
  html = html.split(SAMPLE_SECOND_PARTY).join(secondParty || " ");

  // ---- Page 1: English manifest fields ----
  const driverName = esc(d1.name || "");
  const driverIqama = esc(d1.iqama_no || "");
  html = replaceDivInner(
    html, DRIVER_RESIDENCY,
    `Driver Name: ${driverName ? fit(driverName, 28) : "—"} Residency Number: ${driverIqama || "—"}`
  );

  const d2Name = d2.name ? esc(d2.name) : "—";
  html = replaceDivInner(html, SECOND_DRIVER, `Second Driver Name: ${d2Name}`);

  html = replaceDivInner(
    html, VEHICLE_PLATE,
    `Type of Vehicle: ${carModel ? fit(carModel, 18) : "—"} Registration Number: ${plate || "—"}`
  );

  html = replaceDivInner(
    html, PAX_COUNT_DATE,
    `Total Passengers: ${paxCount} Date: ${dateEn}`
  );

  html = replaceDivInner(html, TIMES, `Start Time: ${tripTime || "—"} End Time: `);

  // ---- Page 1: passenger rows (up to 10; extras blanked) ----
  for (let i = 0; i < PAX_ROWS.length; i++) {
    const p = passengers[i] || {};
    if (p.name) {
      const row = `${i + 1} ${esc(p.name)} ${esc(p.id_number || "")} ${esc(p.nationality || "")} ${routeFrom} ${routeTo}`;
      html = replaceDivInner(html, PAX_ROWS[i], fit(row, 60));
    } else {
      html = replaceDivInner(html, PAX_ROWS[i], " ");
    }
  }

  // ---- Page 1: white out the baked sample data drawn in the page raster ----
  // Inserted right AFTER the page's background image so the mask paints over
  // it, while every text div (which follows in the DOM) still paints on top.
  const p1Idx = html.indexOf('<div id="pf1"');
  if (p1Idx >= 0) {
    const before = html.slice(0, p1Idx);
    const after = html.slice(p1Idx).replace(/(<img\b[^>]*>)/, "$1" + buildPage1Mask());
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
  html = html.replace("<body>", "<body><!--b44-talab-v2-->");

  return html;
}