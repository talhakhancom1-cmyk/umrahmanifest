// Builds the trip document from the Sharif (TALAB ALE) pdf2htmlEX template.
// 3 pages: p1 = Arabic contract, p2 = manifest (header + vehicle details +
// passenger table), p3 = daily vehicle inspection log.
// Dynamic fields are swapped in-place by their pdf2htmlEX class strings;
// the baked Arabic layout, borders, stamps and watermark are preserved.
import { esc, fmtDate } from "./mscTemplate.ts";

export const SHARIF_TEMPLATE_URL =
  "https://media.base44.com/files/public/6a5cef68337f5303ffc014f5/2e0ae0c8e_TLBAALI7934SADAMHUSSAIN.html";

// Page geometry (px) — measured from the rendered template
const PAGE_W = 892.96875;
const PAGE_H = 1262.875;
const pct = (v, ref) => (v / ref * 100).toFixed(4) + "%";

// 12 manifest rows (bottom px, measured from the template's own cells)
const ROW_BOTTOMS = [
  680.67, 643.59, 606.52, 569.41, 532.31, 495.23,
  458.16, 421.08, 383.79, 346.68, 309.57, 272.46
];
const MAX_ROWS = 12;

// Passenger table column boxes (px): left + visible width
const COL_NAT = { left: 47, width: 180, align: "center" };
const COL_ID = { left: 245, width: 165, align: "center" };
const COL_NAME = { left: 520, width: 305, align: "left" };

// ---- Page 1 (contract) field classes ----
const P1_DATE = "m0 x6 h6 y8 ff4 fs0 fc0 sc0 ls1 ws0";
const P1_SECOND_PARTY = "m0 x2d h4 y22 ff4 fs1 fc0 sc0 ls0 ws0";
const P1_FROM = "m0 x37 hc y2b ff4 fs3 fc0 sc0 ls0 ws0";   // sample "SAAD"
const P1_TO = "m0 x26 hc y2b ff4 fs3 fc0 sc0 ls0 ws0";     // sample "AL QASSIM"

// ---- Page 2 (manifest) header + vehicle-detail field classes ----
const P2_DATE = "m0 x26 hc y54 ff4 fs3 fc0 sc0 ls7 ws0";
const P2_TIME = "m0 x5b hc y54 ff4 fs3 fc0 sc0 ls0 ws0";
const P2_TO = "m0 x5f hc y5 ff4 fs3 fc0 sc0 ls0 ws0";      // sample "AL QASSIM"
const P2_FROM = "m0 x61 hc y5 ff4 fs3 fc0 sc0 ls0 ws0";    // sample "SAAD"
const P2_COUNT = "m0 x11 hc y59 ff4 fs3 fc0 sc0 ls7 ws0";  // sample "08"
const P2_V_NAT = "m0 x7d hc y7a ff4 fs3 fc0 sc0 ls0 ws0";   // driver nationality (baked)
const P2_V_PHONE = "m0 x70 hc y7a ff4 fs3 fc0 sc0 ls0 ws0"; // driver phone (baked)
const P2_V_IQAMA = "m0 x83 hc y7a ff4 fs3 fc0 sc0 ls0 ws0";
const P2_V_DRIVER = "m0 x84 hc y7a ff4 fs3 fc0 sc0 ls0 ws0";
const P2_V_PLATE = "m0 x85 hc y7a ff4 fs3 fc0 sc0 ls0 ws0";

// ---- Page 3 (inspection log) field classes ----
const P3_DATE = "m0 x7f h4 y2d ff4 fs1 fc0 sc0 ls4 ws0";
const P3_TIME = "m0 x29 h4 y2d ff4 fs1 fc0 sc0 ls0 ws0";
const P3_PLATE = "m0 x8d h4 y8a ff4 fs3 fc0 sc0 ls0 ws0";
const P3_DRIVER = "m0 x74 h4 y8a ff4 fs3 fc0 sc0 ls0 ws0";

// Baked passenger-cell classes (rows 1-8) to blank before overlaying the
// clean grid. Nationality/ID are ASCII but repeated per row; names carry
// font-marker suffixes — blanking by class is deterministic for all three.
const BLANK_CLASSES = [
  // nationality column
  "m0 x2f h4 y6 ff4 fs1 fc0 sc0 ls0 ws0",
  "m0 x2f h4 y69 ff4 fs1 fc0 sc0 ls0 ws0",
  "m0 x2f h4 y6c ff4 fs1 fc0 sc0 ls0 ws0",
  // id column
  "m0 x30 h4 y6 ff4 fs1 fc0 sc0 ls0 ws0",
  "m0 x2f h4 y6 ff4 fs1 fc0 sc0 ls4 ws0",
  "m0 x2f h4 y69 ff4 fs1 fc0 sc0 ls4 ws0",
  "m0 x2f h4 y6c ff4 fs1 fc0 sc0 ls4 ws0",
  "m0 x1 h4 y6c ff4 fs1 fc0 sc0 ls0 ws0",
  "m0 x78 h4 y6c ff4 fs1 fc0 sc0 ls0 ws0",
  // name column
  "m0 x71 h4 y6 ff4 fs1 fc0 sc0 ls0 ws0",
  "m0 x72 h4 y6 ff4 fs1 fc0 sc0 ls0 ws0",
  "m0 x73 h4 y69 ff4 fs1 fc0 sc0 ls0 ws0",
  "m0 x74 h4 y6 ff4 fs1 fc0 sc0 ls0 ws0",
  "m0 x75 h4 y6c ff4 fs1 fc0 sc0 ls0 ws0",
  "m0 x76 h4 y6c ff4 fs1 fc0 sc0 ls0 ws0",
  "m0 x77 h4 y6c ff4 fs1 fc0 sc0 ls0 ws0"
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

// Normalise time to the template's "06:45am" style (zero-padded, no space).
function fmtTime(t) {
  if (!t) return "";
  const s = String(t).trim();
  const m = s.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!m) return s;
  const hh = String(parseInt(m[1], 10)).padStart(2, "0");
  return `${hh}:${m[2]}${m[3].toLowerCase()}`;
}

function cell(col, bottom, text) {
  return `<div class="b44-cell" style="position:absolute;left:${pct(col.left, PAGE_W)};bottom:${pct(bottom, PAGE_H)};width:${pct(col.width, PAGE_W)};` +
    `text-align:${col.align};font-family:Arial,Helvetica,sans-serif;font-weight:700;font-size:20px;color:#000;z-index:9">${text}</div>`;
}

export function buildFromSharifTemplate(templateHtml, trip) {
  const t = trip || {};
  const passengers = t.passengers || [];
  const drivers = t.drivers || [];
  const date = fmtDate(t.travel_date);
  const time = fmtTime(t.trip_time);
  const from = esc((t.route_from || "").toUpperCase());
  const to = esc((t.route_to || "").toUpperCase());
  const driverName = esc((drivers[0] || {}).name || "");
  const driverIqama = esc((drivers[0] || {}).iqama_no || "");
  const plate = esc(t.vehicle_plate || "");
  const leader = esc((passengers[0] || {}).name || "");
  const rest = Math.max(passengers.length - 1, 0);
  const secondParty = leader
    ? `${leader} / WITH ${String(rest).padStart(2, "0")} MEMBER${rest === 1 ? "" : "S"}`
    : esc(t.second_party_name || "");
  const count = String(Math.min(passengers.length, MAX_ROWS)).padStart(2, "0");

  // Split into head + pages
  const parts = templateHtml.split(/(<div id="pf[123])/);
  let head = parts[0];
  let p1 = (parts[1] || "") + (parts[2] || "");
  let p2 = (parts[3] || "") + (parts[4] || "");
  let p3 = (parts[5] || "") + (parts[6] || "");

  // ---- Page 1: date, second party + member count, route from/to ----
  p1 = replaceDivInner(p1, P1_DATE, date);
  if (leader) p1 = replaceDivInner(p1, P1_SECOND_PARTY, secondParty);
  if (from) p1 = replaceDivInner(p1, P1_FROM, from);
  if (to) p1 = replaceDivInner(p1, P1_TO, to);

  // ---- Page 2: header (time, date, route from/to, pilgrim count) ----
  p2 = replaceDivInner(p2, P2_TIME, time);
  p2 = replaceDivInner(p2, P2_DATE, date);
  if (from) p2 = replaceDivInner(p2, P2_FROM, from);
  if (to) p2 = replaceDivInner(p2, P2_TO, to);
  p2 = replaceDivInner(p2, P2_COUNT, count);

  // ---- Page 2: vehicle details (driver, iqama, plate) ----
  // Phone and driver nationality are baked-in (not captured by the Driver
  // entity) and are left as-is.
  if (driverName) p2 = replaceDivInner(p2, P2_V_DRIVER, driverName);
  if (driverIqama) p2 = replaceDivInner(p2, P2_V_IQAMA, driverIqama);
  if (plate) p2 = replaceDivInner(p2, P2_V_PLATE, plate);

  // ---- Page 2: blank baked passenger cells (rows 1-8) ----
  for (const cls of BLANK_CLASSES) {
    p2 = replaceAllDivInner(p2, cls, " ");
  }

  // ---- Page 2: overlay a clean 3-cell grid for up to 12 rows ----
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

  // ---- Page 3: inspection log date, time, plate, driver ----
  p3 = replaceDivInner(p3, P3_DATE, date);
  p3 = replaceDivInner(p3, P3_TIME, time);
  if (plate) p3 = replaceDivInner(p3, P3_PLATE, plate);
  if (driverName) p3 = replaceDivInner(p3, P3_DRIVER, driverName);

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