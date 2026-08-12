// Rawahil Al Bait manifest template builder.
// Builds the trip document from the Rawahil Al Bait (SHIRKA RAWAHIL AL BAIT)
// pdf2htmlEX template. 3 pages: p1 = Arabic contract, p2 = manifest (header +
// vehicle details + passenger table, 13 rows), p3 = daily vehicle inspection log.
// Dynamic fields are swapped in-place by their pdf2htmlEX class strings; the
// baked Arabic layout, borders, stamps and watermark are preserved.
import { esc } from "./mscTemplate.ts";

export const RAWAHIL_TEMPLATE_URL =
  "https://media.base44.com/files/public/6a5cef68337f5303ffc014f5/91ca74d3f_6928LSASHIRKARAWAHILALBAIT.html";

// Page geometry (px) — measured from the rendered template
const PAGE_W = 892.98;
const PAGE_H = 1262.88;
const pct = (v, ref) => (v / ref * 100).toFixed(4) + "%";

// 13 manifest rows (bottom px, page-absolute; rows 10-13 derived from their
// row-number markers which sit 5.8px below the data baseline)
const ROW_BOTTOMS = [
  770.5, 725.0, 677.3, 629.4, 581.7, 536.1, 488.4,
  440.7, 392.8, 340.1, 292.4, 244.5, 196.8
];
const MAX_ROWS = 13;

// Passenger table column boxes (px)
const COL_NAT = { left: 55, width: 190, align: "center" };
const COL_ID = { left: 260, width: 190, align: "center" };
const COL_NAME = { left: 464, width: 300, align: "center" };

// ---- Page 1 (contract) field classes ----
const P1_DATE = "m0 x6 h6 ya ff3 fs3 fc0 sc0 ls3 ws0";           // contains "7-Jul-26" inside a long line
const P1_SECOND_PARTY = "m0 x52 h3 y44 ff3 fs1 fc0 sc0 ls0 ws0"; // sample "KHAWAJA"
const P1_FROM = "m0 x58 h3 y44 ff3 fs1 fc0 sc0 ls0 ws0";         // sample "ALMOYAH"
const P1_TO = "m0 x5b h3 y44 ff3 fs1 fc0 sc0 ls0 ws0";           // sample "MAKKAH"

// ---- Page 2 (manifest) header + vehicle-detail field classes ----
const P2_IQAMA = "m0 x65 h3 y56 ff3 fs1 fc0 sc0 ls7 ws0";  // sample "2528327659"
const P2_DRIVER = "m0 x55 h3 y56 ff3 fs1 fc0 sc0 ls0 ws0"; // sample "SANI GUL"
const P2_PLATE = "m0 x66 h3 y56 ff3 fs1 fc0 sc0 ls0 ws0";  // sample "6928 LSA"
const P2_CAR = "m0 x2 h6 y56 ff3 fs1 fc0 sc0 ls0 ws0";     // sample "HYOUNDAI"
const P2_ROUTE = "m0 x68 h3 y5a ff3 fs1 fc0 sc0 ls0 ws0";  // sample "ALMOYAH TO MAKKAH"
const P2_DATE = "m0 x54 h3 y5a ff3 fs1 fc0 sc0 ls0 ws0";   // sample "7-Jul-26"
const P2_TIME = "m0 x6c h3 y5c ff3 fs1 fc0 sc0 ls0 ws0";   // sample "7:36 PM"

// ---- Page 3 (inspection log) field classes ----
const P3_TIME = "m0 x6b h1e y86 ff3 fs5 fc0 sc0 ls0 ws0";
const P3_DATE = "m0 x6d h1e y86 ff3 fs5 fc0 sc0 ls0 ws0";
const P3_PLATE = "m0 x72 h1e y86 ff3 fs5 fc0 sc0 lsa ws0";
const P3_DRIVER = "m0 x72 h1e y86 ff3 fs5 fc0 sc0 ls0 ws0";
const P3_DRIVER2 = "m0 x9b h1e yb6 ff3 fs5 fc0 sc0 ls0 ws0"; // driver name repeated at log footer

// Baked passenger-cell classes (rows 1-9) to blank before overlaying the grid
const BLANK_CLASSES = [
  // nationality column
  "m0 x72 h3 y62 ff3 fs1 fc0 sc0 ls0 ws0",
  "m0 x6b h3 y65 ff3 fs1 fc0 sc0 ls0 ws0",
  "m0 x72 h3 y65 ff3 fs1 fc0 sc0 ls0 ws0",
  "m0 x77 h3 y69 ff3 fs1 fc0 sc0 ls0 ws0",
  "m0 x77 h3 y6c ff3 fs1 fc0 sc0 ls0 ws0",
  "m0 x78 h3 y65 ff3 fs1 fc0 sc0 ls0 ws0",
  "m0 x77 h3 y71 ff3 fs1 fc0 sc0 ls0 ws0",
  "m0 x6c h3 y74 ff3 fs1 fc0 sc0 ls0 ws0",
  // id column
  "m0 x66 h3 y62 ff3 fs1 fc0 sc0 ls7 ws0",
  "m0 x55 h3 y65 ff3 fs1 fc0 sc0 ls0 ws0",
  "m0 x66 h3 y65 ff3 fs1 fc0 sc0 ls7 ws0",
  "m0 x66 h3 y69 ff3 fs1 fc0 sc0 ls7 ws0",
  "m0 x66 h3 y6c ff3 fs1 fc0 sc0 ls7 ws0",
  "m0 x66 h3 y71 ff3 fs1 fc0 sc0 ls7 ws0",
  "m0 x66 h3 y74 ff3 fs1 fc0 sc0 ls7 ws0",
  // name column
  "m0 x73 h3 y62 ff3 fs1 fc0 sc0 ls0 ws0",
  "m0 x75 h3 y65 ff3 fs1 fc0 sc0 ls0 ws0",
  "m0 x76 h3 y65 ff3 fs1 fc0 sc0 ls0 ws0",
  "m0 x2b h3 y69 ff3 fs1 fc0 sc0 ls0 ws0",
  "m0 x76 h3 y6c ff3 fs1 fc0 sc0 ls0 ws0",
  "m0 x79 h3 y65 ff3 fs1 fc0 sc0 ls8 ws0",
  "m0 x3e h3 y65 ff3 fs1 fc0 sc0 ls0 ws0",
  "m0 x7a h3 y71 ff3 fs1 fc0 sc0 ls0 ws0",
  "m0 x7b h3 y74 ff3 fs1 fc0 sc0 ls0 ws0"
];

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Replace the inner content of the FIRST div matching a full class string.
function replaceDivInner(html, fullClass, newInner) {
  const cls = escapeRegex(fullClass);
  return html.replace(
    new RegExp('(<div class="t ' + cls + '"[^>]*>)[\\s\\S]*?(</div>)'),
    "$1" + newInner + "$2"
  );
}

// Replace the inner content of EVERY div matching a full class string.
function replaceAllDivInner(html, fullClass, newInner) {
  const cls = escapeRegex(fullClass);
  return html.replace(
    new RegExp('(<div class="t ' + cls + '"[^>]*>)[\\s\\S]*?(</div>)', "g"),
    "$1" + newInner + "$2"
  );
}

// Template date style: "7-Jul-26"
function fmtDate(d) {
  if (!d) return "";
  const dt = new Date(d + "T00:00:00");
  if (isNaN(dt.getTime())) return String(d);
  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${dt.getDate()}-${MONTHS[dt.getMonth()]}-${String(dt.getFullYear()).slice(2)}`;
}

// Squeeze a value horizontally so it stays inside its baked cell width.
function fit(text, fits) {
  const s = String(text);
  if (s.length <= fits) return s;
  const sx = (fits / s.length).toFixed(3);
  return `<span style="display:inline-block;white-space:nowrap;transform:scaleX(${sx});transform-origin:left center">${s}</span>`;
}

function cell(col, bottom, text) {
  // Single line always: long values are squeezed horizontally to fit.
  const CHAR_W = 13.2; // avg px per char at 20px bold Arial
  const est = String(text).length * CHAR_W;
  const sx = est > col.width ? (col.width / est).toFixed(3) : "1";
  return `<div class="b44-cell" style="position:absolute;left:${pct(col.left, PAGE_W)};bottom:${pct(bottom, PAGE_H)};width:${pct(col.width, PAGE_W)};` +
    `text-align:${col.align};white-space:nowrap;overflow:visible;line-height:1.1;transform:scaleX(${sx});transform-origin:center center;` +
    `font-family:Arial,Helvetica,sans-serif;font-weight:700;font-size:20px;color:#000;z-index:9">${text}</div>`;
}

export function buildFromRawahilTemplate(templateHtml, trip) {
  const t = trip || {};
  const passengers = t.passengers || [];
  const drivers = t.drivers || [];
  const date = fmtDate(t.travel_date);
  const time = esc(t.trip_time || "");
  const from = esc((t.route_from || "").replace(/_/g, " ").toUpperCase());
  const to = esc((t.route_to || "").replace(/_/g, " ").toUpperCase());
  const driverName = esc((drivers[0] || {}).name || "");
  const driverIqama = esc((drivers[0] || {}).iqama_no || "");
  const plate = esc(t.vehicle_plate || "");
  const carModel = esc(t.car_model || "");
  const leader = esc((passengers[0] || {}).name || "");
  const secondParty = leader || esc(t.second_party_name || "");

  // Split into head + pages
  const parts = templateHtml.split(/(<div id="pf[123])/);
  let head = parts[0];
  let p1 = (parts[1] || "") + (parts[2] || "");
  let p2 = (parts[3] || "") + (parts[4] || "");
  let p3 = (parts[5] || "") + (parts[6] || "");

  // ---- Page 1: date (embedded in a long line), second party, route ----
  if (date) {
    const cls = escapeRegex(P1_DATE);
    p1 = p1.replace(
      new RegExp('(<div class="t ' + cls + '"[^>]*>[\\s\\S]*?)7-Jul<span class="_ _e"></span>-<span class="ls4">26</span>'),
      "$1" + date
    );
  }
  if (secondParty) p1 = replaceDivInner(p1, P1_SECOND_PARTY, fit(secondParty, 24));
  if (from) p1 = replaceDivInner(p1, P1_FROM, fit(from, 12));
  if (to) p1 = replaceDivInner(p1, P1_TO, fit(to, 12));

  // ---- Page 2: header + vehicle details ----
  if (driverIqama) p2 = replaceDivInner(p2, P2_IQAMA, driverIqama);
  if (driverName) p2 = replaceDivInner(p2, P2_DRIVER, fit(driverName, 16));
  if (plate) p2 = replaceDivInner(p2, P2_PLATE, plate);
  if (carModel) p2 = replaceDivInner(p2, P2_CAR, fit(carModel, 10));
  if (from && to) p2 = replaceDivInner(p2, P2_ROUTE, fit(`${from} TO ${to}`, 20));
  p2 = replaceDivInner(p2, P2_DATE, date);
  p2 = replaceDivInner(p2, P2_TIME, time);

  // ---- Page 2: blank baked passenger cells (rows 1-9) ----
  for (const cls of BLANK_CLASSES) {
    p2 = replaceAllDivInner(p2, cls, " ");
  }

  // ---- Page 2: overlay a clean 3-cell grid for up to 13 rows ----
  let p2Cells = "";
  for (let i = 0; i < Math.min(passengers.length, MAX_ROWS); i++) {
    const p = passengers[i] || {};
    p2Cells += cell(COL_NAT, ROW_BOTTOMS[i], esc(p.nationality || ""));
    p2Cells += cell(COL_ID, ROW_BOTTOMS[i], esc(p.id_number || ""));
    p2Cells += cell(COL_NAME, ROW_BOTTOMS[i], esc(p.name || ""));
  }
  if (p2Cells) {
    const grid = `<div class="b44-grid" style="position:absolute;left:0;bottom:0;width:100%;height:100%;overflow:visible;z-index:9">${p2Cells}</div>`;
    const idx = p2.indexOf('<div id="pf2"');
    if (idx >= 0) {
      const before = p2.slice(0, idx);
      const after = p2.slice(idx).replace(/(<div class="pc[^"]*">)/, `$1${grid}`);
      p2 = before + after;
    }
  }

  // ---- Page 3: inspection log time, date, plate, driver ----
  p3 = replaceDivInner(p3, P3_TIME, time || "5:00 AM");
  p3 = replaceDivInner(p3, P3_DATE, date);
  if (plate) p3 = replaceDivInner(p3, P3_PLATE, plate);
  if (driverName) p3 = replaceDivInner(p3, P3_DRIVER, fit(driverName, 14));
  if (driverName) p3 = replaceDivInner(p3, P3_DRIVER2, fit(driverName, 14));

  // ---- CSS overrides (same print-safe setup as the other templates) ----
  const extraCss = `
<style>
#sidebar{display:none!important}
#page-container{left:0!important}
.loading-indicator{display:none!important}
.t{overflow:visible!important}
@media screen{.pc{display:block!important;opacity:1!important}}
@media print{@page{size:A4;margin:0}}
</style>`;
  head = head.replace("</head>", extraCss + "\n</head>");
  head = head.replace("<title></title>", `<title>${esc(t.trip_name || "Trip Manifest")}</title>`);

  return head + p1 + p2 + p3;
}