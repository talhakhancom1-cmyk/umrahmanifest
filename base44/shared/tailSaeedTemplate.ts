// Builds the trip document from the Tail Saeed Ibrahim Al-Thubaiti pdf2htmlEX template.
// The template has 2 pages: page 1 = contract/declaration, page 2 = manifest table.
// Static Arabic layout lives in per-page background images; dynamic Latin values
// are swapped in-place inside the text layer.
// Driver details (M TAWAF KHAN, iqama 2575680273, plate 7770-LXA, HUNDAI STARIA,
// phone 0509567527) are BAKED IN and never overridden — only date, route, time,
// second party, and passenger data are dynamic.
import { esc, fmtDate, replaceTDivs, centered } from "./mscTemplate.ts";
import { placeNameAr } from "./placeNamesAr.ts";

export const TAIL_SAEED_TEMPLATE_URL =
  "https://media.base44.com/files/public/6a5cef68337f5303ffc014f5/228644818_TAILSAEED7770MTAWAFKHAN.html";

// Page geometry (px)
const PAGE_W = 892.98;
const PAGE_H = 1262.88;
const pct = (v, ref) => (v / ref * 100).toFixed(4) + "%";

// Passenger table column geometry (px) — measured from the template's own cell containers
const COL_NAT = { left: 42.66, width: 185.97 };
const COL_ID = { left: 229.35, width: 186.15 };
const COL_NAME = { left: 416.235, width: 387.075 };

// Row bottoms (px) for the 23 data rows — measured from the template's containers
const ROW_BOTTOMS = [
  737.925, 711.465, 685.185, 658.725, 632.445, 605.985, 579.495, 553.215,
  526.755, 500.475, 474.015, 447.735, 421.275, 394.815, 368.535, 342.075,
  315.75, 289.29, 262.83, 236.55, 210.09, 183.81, 157.35
];
const MAX_ROWS = 23;

// Sample values baked into the template's text layer
const SAMPLE_DATE = "09-Jul-26";
const SAMPLE_TIME = "06:00pm";
const SAMPLE_SECOND_PARTY = "SHAHID / WITH 01 MEMBER";
const SAMPLE_FROM = "MADINAH";
const SAMPLE_TO = "MAKKAH";
const SAMPLE_ROUTE_P2 = "MADINAH TO MAKKAH";
const SAMPLE_PAX_NAMES = ["SHAHID", "M RIYAZ"];

function cell(col, bottom, text) {
  return `<div class="b44-cell" style="position:absolute;left:${pct(col.left, PAGE_W)};bottom:${pct(bottom, PAGE_H)};width:${pct(col.width, PAGE_W)};` +
    `text-align:center;font-family:Arial,Helvetica,sans-serif;font-weight:700;font-size:13px;color:#000;z-index:9">${text}</div>`;
}

export function buildFromTailSaeedTemplate(templateHtml, trip) {
  const t = trip || {};
  const date = fmtDate(t.travel_date);
  const time = esc(t.trip_time || "");
  const from = esc(placeNameAr(t.route_from));
  const to = esc(placeNameAr(t.route_to));
  const route = from && to ? `${from} TO ${to}` : "";
  const passengers = t.passengers || [];
  const leader = esc((passengers[0] || {}).name || "");
  const secondParty = leader
    ? `${leader} / WITH ${Math.max(passengers.length - 1, 0)} MEMBER${passengers.length > 2 ? "S" : ""}`
    : esc(t.second_party_name || "");

  // Split into head + pages
  const parts = templateHtml.split(/(<div id="pf[123]")/);
  let head = parts[0];
  let p1 = (parts[1] || "") + (parts[2] || "");
  let p2 = (parts[3] || "") + (parts[4] || "");

  // ---- Page 1: date, second party, route from/to ----
  p1 = replaceTDivs(p1, [
    (s) => s === SAMPLE_DATE ? date : null,
    // Keep "SHAHID" as the second party, but make the member count dynamic
    (s) => s === SAMPLE_SECOND_PARTY
      ? centered(`SHAHID / WITH ${String(Math.max(passengers.length - 1, 0)).padStart(2, "0")} MEMBER${passengers.length - 1 === 1 ? "" : "S"}`)
      : null,
    (s) => s === SAMPLE_FROM ? centered(from) : null,
    (s) => s === SAMPLE_TO ? centered(to) : null,
  ]);

  // ---- Page 2: route string, date, time ----
  p2 = replaceTDivs(p2, [
    (s) => s === SAMPLE_ROUTE_P2 ? centered(route) : null,
    (s) => s === SAMPLE_DATE ? date : null,
    (s) => s === SAMPLE_TIME ? time : null,
    // Blank the 2 sample passenger names so the clean overlay replaces them
    (s) => SAMPLE_PAX_NAMES.indexOf(s) >= 0 ? "" : null,
  ]);

  // ---- Page 2: overlay passenger grid (nationality, ID, name) ----
  let p2Cells = "";
  for (let i = 0; i < Math.min(passengers.length, MAX_ROWS); i++) {
    const p = passengers[i] || {};
    const bottom = ROW_BOTTOMS[i];
    p2Cells += cell(COL_NAT, bottom, esc(p.nationality || ""));
    p2Cells += cell(COL_ID, bottom, esc(p.id_number || ""));
    p2Cells += cell(COL_NAME, bottom, esc(p.name || ""));
  }
  if (p2Cells) {
    // Anchor cells to a full-page wrapper so percentage positions resolve
    // against the page box in both screen and print.
    const grid = `<div class="b44-grid" style="position:absolute;left:0;bottom:0;width:100%;height:100%;overflow:visible;z-index:9">${p2Cells}</div>`;
    const idx = p2.indexOf('<div id="pf2"');
    if (idx >= 0) {
      const before = p2.slice(0, idx);
      const after = p2.slice(idx).replace(/(<div class="pc[^"]*">)/, `$1${grid}`);
      p2 = before + after;
    }
  }

  // ---- CSS overrides ----
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

  return head + p1 + p2;
}