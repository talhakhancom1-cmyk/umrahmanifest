// Builds the trip document from the Jiwah Al-Sahab (JSC Transport) contract template.
// The template's baked driver name, iqama, plate, car and phone are preserved
// as-is (kept visible in the text layer). Only date, time, destination and
// passenger data are dynamic — replaced in-place + a clean passenger grid overlay.
import { esc, fmtDate, replaceTDivs } from "./mscTemplate.ts";

export const JIWAH_TEMPLATE_URL =
  "https://media.base44.com/files/public/6a5cef68337f5303ffc014f5/95a6f8eb0_JIWARALSAHAB3380SHAFIQUEURREHMAN.html";

// Page 2 — passenger table geometry (px), measured from the template's own cells.
// Columns left→right: Nationality, Passport/ID, Guest Name (the No. column is baked).
const P2_ROW1_BOTTOM = 700;
const P2_ROW_STEP = 36;
const P2_MAX_ROWS = 14;
const P2_COLS = {
  nat: { left: 124, width: 177 },
  id: { left: 292, width: 189 },
  name: { left: 447, width: 350 }
};

// Sample values baked into the template's text layer (kept in sync with the source PDF)
const SAMPLE_DATE = "25-Jul-26";
const SAMPLE_TIME = "2:50 PM";
const SAMPLE_ROUTE_P2 = "MAKKAH TO TAIF TO MAKKAH";   // page 2 destination field
const SAMPLE_FROM_P1 = "MAKKAH TO TAIF";              // page 1 "transport from" field
const SAMPLE_TO_P1 = "MAKKAH";                        // page 1 "to" destination field
const SAMPLE_SECOND_PARTY = "ZUBER ISMAIL MAHAMMAD ALI DAJI / WITH 10 MEMBERS";
const SAMPLE_NAT = "INDIA";
const SAMPLE_NAMES = [
  "ZUBER ISMAIL MAHAMMAD ALI DAJI",
  "SUHEIL VALI MAHAMMED MUNSHI",
  "MOHD ASIF PATEL",
  "REHANA SAEED PATEL",
  "ROMANA ASIF PATEL",
  "ZARINA YAKUB PATEL",
  "ZARINABAHEN IBRAHIM AHMED",
  "FEHMIDA HAFEJ AYYUBBHAI",
  "ASFAK NISAR GULAM GHANTIWALA",
  "RUBINABANU ASFAK GHANTIWALA",
  "SALIM ISMAIL AHMED PATEL"
];
const SAMPLE_IDS = [
  "T6404193", "V6417336", "B9192212", "AU470871", "AN817922",
  "P9386174", "R8434634", "AS031488", "C8722701", "S3622053", "W3784633"
];

function cell(col, bottom, text) {
  return `<div class="b44-cell" style="position:absolute;left:${col.left}px;bottom:${bottom}px;width:${col.width}px;` +
    `text-align:center;font-family:Arial,Helvetica,sans-serif;font-weight:700;font-size:12px;color:#000;z-index:9">${text}</div>`;
}

export function buildFromJiwahTemplate(templateHtml, trip) {
  const t = trip || {};
  const date = fmtDate(t.travel_date);
  const time = esc(t.trip_time || "");
  const from = esc((t.route_from || "").toUpperCase());
  const to = esc((t.route_to || "").toUpperCase());
  const route = from && to ? `${from} TO ${to}` : "";
  const passengers = t.passengers || [];
  const leader = esc((passengers[0] || {}).name || "");
  const secondParty = leader ? `${leader} / WITH ${Math.max(passengers.length - 1, 0)} MEMBERS` : "";

  let html = templateHtml;

  // In-place replacements: date, time, route/destination, group leader; blank
  // the sample passenger cells so the clean overlay grid can replace them.
  // Driver name / iqama / plate / car / phone are intentionally NOT touched.
  html = replaceTDivs(html, [
    (s) => s === SAMPLE_DATE ? date : null,
    (s) => s === SAMPLE_TIME ? time : null,
    (s) => s === SAMPLE_ROUTE_P2 ? route : null,
    (s) => s === SAMPLE_FROM_P1 ? from : null,
    (s) => s === SAMPLE_TO_P1 ? to : null,
    (s) => s === SAMPLE_SECOND_PARTY ? secondParty : null,
    (s) => SAMPLE_NAMES.indexOf(s) >= 0 ? "" : null,
    (s) => SAMPLE_IDS.indexOf(s) >= 0 ? "" : null,
    (s) => s === SAMPLE_NAT ? "" : null
  ]);

  // Overlay a clean passenger grid (nationality, passport id, name)
  let p2Cells = "";
  for (let i = 0; i < Math.min(passengers.length, P2_MAX_ROWS); i++) {
    const p = passengers[i] || {};
    const bottom = P2_ROW1_BOTTOM - i * P2_ROW_STEP;
    p2Cells += cell(P2_COLS.nat, bottom, esc(p.nationality || ""));
    p2Cells += cell(P2_COLS.id, bottom, esc(p.id_number || ""));
    p2Cells += cell(P2_COLS.name, bottom, esc(p.name || ""));
  }
  if (p2Cells) {
    // Anchor cells to a zero-size wrapper at the page's bottom-left. The
    // template's @media print stylesheet re-declares all layout in pt at an
    // 8/9 scale (1px screen -> 0.888.. pt), while inline px styles print at
    // 1px = 0.75pt — without compensation the overlay drifts ~3 rows down in
    // print. Scaling the wrapper by (8/9)/0.75 = 32/27 in print keeps the
    // cells locked to the grid.
    const grid = `<div class="b44-grid" style="position:absolute;left:0;bottom:0;width:0;height:0;overflow:visible">${p2Cells}</div>`;
    const idx = html.indexOf('<div id="pf2"');
    if (idx >= 0) {
      const before = html.slice(0, idx);
      const after = html.slice(idx).replace(/(<div class="pc[^"]*">)/, `$1${grid}`);
      html = before + after;
    }
  }

  const extraCss = `
<style>
#sidebar{display:none!important}
#page-container{left:0!important}
.loading-indicator{display:none!important}
.t{overflow:visible!important}
@media screen{.pc{display:block!important;opacity:1!important}}
@media print{@page{size:A4;margin:0}.b44-grid{transform:scale(1.1851852);transform-origin:left bottom}}
</style>`;
  html = html.replace("</head>", extraCss + "\n</head>");
  html = html.replace("<title></title>", `<title>${esc(t.trip_name || "Trip Manifest")}</title>`);
  return html;
}