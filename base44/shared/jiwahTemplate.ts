// Builds the trip document from the Jiwah Al-Sahab (JSC Transport) contract template.
// Page 1: Road Transport Contract with header fields (date, second party, route)
// Page 2: 4-column passenger table
// All static layout (Arabic labels, table lines, stamp, QR) lives in the page
// background images; dynamic values are overlaid as absolutely-positioned "b44-cell" divs.
import { esc, fmtDate } from "./mscTemplate.ts";

export const JIWAH_TEMPLATE_URL =
  "https://media.base44.com/files/public/6a5cef68337f5303ffc014f5/95a6f8eb0_JIWARALSAHAB3380SHAFIQUEURREHMAN.html";

// Page dimensions (px) — measured from the pdf2htmlEX CSS
const PAGE_W = 892.98;
const PAGE_H = 1262.88;

// Page 1 — Contract header fields (px, bottom-up origin)
// These positions were measured from the original PDF text-layer divs
const P1_DATE = { left: 660, bottom: 764, width: 200, fontSize: 11 };
const P1_SECOND_PARTY = { left: 250, bottom: 727, width: 600, fontSize: 10 };
const P1_ROUTE_FROM = { left: 250, bottom: 709, width: 350, fontSize: 11 };
const P1_ROUTE_TO = { left: 395, bottom: 702, width: 350, fontSize: 11 };

// Page 2 — Passenger table geometry
// Table starts near the top of page 2, 4 columns
const P2_ROW1_BOTTOM = 1063;
const P2_ROW_STEP = 19.2;
const P2_MAX_ROWS = 28;
const P2_COLS = {
  name: { left: 55, width: 250 },
  id: { left: 310, width: 170 },
  nat: { left: 485, width: 180 },
  gender: { left: 670, width: 170 }
};

// Page 2 — Driver/vehicle header fields
const P2_DRIVER = { left: 55, bottom: 1085, width: 250, fontSize: 11 };
const P2_PLATE = { left: 310, bottom: 1085, width: 170, fontSize: 11 };
const P2_DEST = { left: 485, bottom: 1085, width: 180, fontSize: 11 };
const P2_DATE = { left: 670, bottom: 1085, width: 170, fontSize: 11 };

function cell(col, bottom, text, fontSize, align) {
  return `<div class="b44-cell" style="position:absolute;left:${col.left}px;bottom:${bottom}px;width:${col.width}px;` +
    `text-align:${align || "center"};font-family:Arial,Helvetica,sans-serif;font-weight:700;font-size:${fontSize || 13}px;color:#000;z-index:9">${text}</div>`;
}

export function buildFromJiwahTemplate(templateHtml, trip) {
  const t = trip || {};
  const date = fmtDate(t.travel_date);
  const time = esc(t.trip_time || "");
  const from = esc((t.route_from || "").toUpperCase());
  const to = esc((t.route_to || "").toUpperCase());
  const d1 = (t.drivers || [])[0] || {};
  const passengers = t.passengers || [];
  const secondParty = esc(t.second_party_name || "");

  // ---- Page 1 cells (contract) ----
  let p1Cells = "";
  p1Cells += cell(P1_DATE, P1_DATE.bottom, `${date}${time ? " " + time : ""}`, P1_DATE.fontSize);
  if (secondParty) {
    p1Cells += cell(P1_SECOND_PARTY, P1_SECOND_PARTY.bottom, secondParty, P1_SECOND_PARTY.fontSize, "right");
  }
  p1Cells += cell(P1_ROUTE_FROM, P1_ROUTE_FROM.bottom, from && to ? `${from} TO ${to}` : "", P1_ROUTE_FROM.fontSize);
  p1Cells += cell(P1_ROUTE_TO, P1_ROUTE_TO.bottom, to, P1_ROUTE_TO.fontSize);

  // ---- Page 2 cells (table header + passenger rows) ----
  let p2Cells = "";
  // Table header fields
  p2Cells += cell(P2_DRIVER, P2_DRIVER.bottom, esc(d1.name || ""), P2_DRIVER.fontSize, "center");
  p2Cells += cell(P2_PLATE, P2_PLATE.bottom, esc(t.vehicle_plate || ""), P2_PLATE.fontSize);
  p2Cells += cell(P2_DEST, P2_DEST.bottom, from && to ? `${from} TO ${to}` : "", P2_DEST.fontSize);
  p2Cells += cell(P2_DATE, P2_DATE.bottom, date, P2_DATE.fontSize);

  // Passenger rows
  for (let i = 0; i < Math.min(passengers.length, P2_MAX_ROWS); i++) {
    const p = passengers[i] || {};
    const bottom = P2_ROW1_BOTTOM - i * P2_ROW_STEP;
    p2Cells += cell(P2_COLS.name, bottom, esc(p.name || ""), 12);
    p2Cells += cell(P2_COLS.id, bottom, esc(p.id_number || ""), 12);
    p2Cells += cell(P2_COLS.nat, bottom, esc(p.nationality || ""), 12);
    p2Cells += cell(P2_COLS.gender, bottom, esc(p.gender || ""), 12);
  }

  // Hide all original text divs and inject our cells
  let html = templateHtml;

  // Inject page-specific cells into each page's content container
  const inject = (pageId, cells) => {
    const idx = html.indexOf(`<div id="${pageId}"`);
    if (idx >= 0) {
      const before = html.slice(0, idx);
      const after = html.slice(idx).replace(/(<div class="pc[^"]*">)/, `$1${cells}`);
      html = before + after;
    }
  };
  inject("pf1", p1Cells);
  inject("pf2", p2Cells);

  const extraCss = `
<style>
#sidebar{display:none!important}
#page-container{left:0!important}
.loading-indicator{display:none!important}
.t{visibility:hidden!important}
@media screen{.pc{display:block!important;opacity:1!important}}
@media print{@page{size:A4;margin:0}}
</style>`;
  html = html.replace("</head>", extraCss + "\n</head>");
  html = html.replace("<title></title>", `<title>${esc(t.trip_name || "Trip Manifest")}</title>`);
  return html;
}