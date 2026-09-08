// Warda Al Hayah Co manifest template builder.
// 2 pages: p1 = Arabic contract + vehicle details + passenger table (13 rows),
// p2 = daily vehicle inspection record (all "Sound" cells ticked OK).
// Dynamic fields overlaid at measured page-absolute positions; baked layout,
// borders, logo and QR are preserved.
import { esc } from "./mscTemplate.ts";

export const WARDA_TEMPLATE_URL =
  "https://media.base44.com/files/public/6a5cef68337f5303ffc014f5/248622c66__merged.html";

// Page geometry (px), measured from the rendered template
const PAGE_W = 918;
const PAGE_H = 1512;
const pct = (v, ref) => (v / ref * 100).toFixed(4) + "%";

// ---- Page 1 ----
// Second-party placeholder baked into the template
const P1_SECOND_PARTY = "m0 x1b h5 y25 ff1 fs0 fc0 sc0 ls0 ws0";
// Baked "جوال: 0562220591" mobile value on page 1
const P1_MOBILE = "m0 x11 h5 y1c ff1 fs0 fc0 sc0 ls2 ws0";

// Passenger table columns (RTL: # | name | id | nationality)
const COL_NAME = { left: 464, width: 334, align: "center" };
const COL_ID = { left: 247, width: 217, align: "center" };
const COL_NAT = { left: 29, width: 218, align: "center" };
const ROW_BOTTOMS = [743, 714, 685, 656, 627, 598, 569, 540, 511, 482, 453, 424, 395];
const MAX_ROWS = 13;

// Vehicle details row (bottom ~858): type | plate | driver | iqama | phone
const VEH_BOTTOM = 858;
const VEH = {
  type: { left: 793, width: 94 },
  plate: { left: 678, width: 115 },
  driver: { left: 464, width: 214 },
  iqama: { left: 247, width: 217 },
  phone: { left: 29, width: 218 }
};
// Date value cell (row with التاريخ label)
const P1_DATE_CELL = { left: 678, width: 112, bottom: 828 };
// Notes value cell (left of الملاحظات label, same row as date)
const P1_NOTES_CELL = { left: 29, width: 430, bottom: 828 };
// Trip number value cell (row with رقم الرحلة label)
const P1_TRIPNO_CELL = { left: 678, width: 112, bottom: 799 };
// Route row (النقل من / وصولا الى): baked sample values are covered then overlaid
const ROUTE_ROW = { bottom: 1025, height: 30, textBottom: 1033 };
const ROUTE_FROM_BOX = { left: 464, width: 316 };
const ROUTE_TO_BOX = { left: 29, width: 217 };

// ---- Page 2 (inspection record) ----
// Header data row: driver | plate | date | time
const P2_ROW_BOTTOM = 1257;
const P2 = {
  driver: { left: 570, width: 302 },
  plate: { left: 394, width: 176 },
  date: { left: 219, width: 175 },
  time: { left: 44, width: 175 }
};
// "Sound - سليم" column checkmarks — one per checklist item, all marked OK
const SOUND_COL = { left: 394, width: 176 };
const ITEM_BOTTOMS = [
  1149, 1112, 1075, 1038, 1001, 964,      // dashboard indicators
  863, 826, 789, 752, 715,                // exterior checks
  614, 577, 540, 503, 462                 // safety equipment
];

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function replaceDivInner(html, fullClass, newInner) {
  const cls = escapeRegex(fullClass);
  return html.replace(
    new RegExp('(<div class="t ' + cls + '"[^>]*>)[\\s\\S]*?(</div>)'),
    "$1" + newInner + "$2"
  );
}

// Template date style: "06-06-2026"
function fmtDate(d) {
  if (!d) return "";
  const dt = new Date(d + "T00:00:00");
  if (isNaN(dt.getTime())) return String(d);
  const p = (n) => String(n).padStart(2, "0");
  return `${p(dt.getDate())}-${p(dt.getMonth() + 1)}-${dt.getFullYear()}`;
}

// Squeeze an in-place replacement value so it stays inside its baked cell
function fitSpan(text, fits) {
  const s = String(text);
  if (s.length <= fits) return s;
  const sx = (fits / s.length).toFixed(3);
  return `<span style="display:inline-block;white-space:nowrap;transform:scaleX(${sx});transform-origin:left center">${s}</span>`;
}

// Overlay text box, squeezed horizontally if too long for its cell
function box(colOrBox, bottom, text, extra) {
  const s = String(text);
  if (!s) return "";
  const CHAR_W = 11; // avg px per char at 15px bold Arial
  const est = s.length * CHAR_W;
  const avail = colOrBox.width * 0.9; // margin so squeezed text stays off the cell borders
  const sx = est > avail ? (avail / est).toFixed(3) : "1";
  return `<div class="b44-cell" style="position:absolute;left:${pct(colOrBox.left, PAGE_W)};bottom:${pct(bottom, PAGE_H)};width:${pct(colOrBox.width, PAGE_W)};` +
    `text-align:center;white-space:nowrap;overflow:visible;line-height:1.1;transform:scaleX(${sx});transform-origin:center center;` +
    `font-family:Arial,Helvetica,sans-serif;font-weight:700;font-size:15px;color:#000;z-index:9${extra || ""}">${s}</div>`;
}

function whiteCover(left, bottom, width, height) {
  return `<div style="position:absolute;left:${pct(left, PAGE_W)};bottom:${pct(bottom, PAGE_H)};width:${pct(width, PAGE_W)};height:${pct(height, PAGE_H)};background:#fff;z-index:8"></div>`;
}

// Inject overlay markup inside a page's first .pc container
function inject(pageHtml, pageId, overlay) {
  const idx = pageHtml.indexOf('<div id="' + pageId + '"');
  if (idx < 0) return pageHtml;
  const before = pageHtml.slice(0, idx);
  const after = pageHtml.slice(idx).replace(/(<div class="pc[^"]*">)/, `$1<div style="position:absolute;left:0;bottom:0;width:100%;height:100%;overflow:visible;z-index:9">${overlay}</div>`);
  return before + after;
}

export function buildFromWardaTemplate(templateHtml, trip) {
  const t = trip || {};
  const passengers = t.passengers || [];
  const drivers = t.drivers || [];
  const date = fmtDate(t.travel_date);
  const time = esc(t.trip_time || "");
  const from = esc((t.route_from || "").replace(/_/g, " ").toUpperCase());
  const to = esc((t.route_to || "").replace(/_/g, " ").toUpperCase());
  const driverName = esc((drivers[0] || {}).name || "");
  const driverIqama = esc((drivers[0] || {}).iqama_no || "");
  const driverPhone = esc((drivers[0] || {}).phone || "");
  const plate = esc(t.vehicle_plate || "");
  const carModel = esc(t.car_model || "");

  const parts = templateHtml.split(/(<div id="pf[12])/);
  let head = parts[0];
  let p1 = (parts[1] || "") + (parts[2] || "");
  let p2 = (parts[3] || "") + (parts[4] || "");

  // ---- Page 1: top date + second party (in-place text swaps) ----
  if (date) p1 = p1.replace(/06-06-2<span class="_ _0"><\/span>026/, date);
  const secondParty = driverName
    ? `${driverName} WITH ${passengers.length} PASSENGERS`
    : esc(t.second_party_name || "");
  if (secondParty) p1 = replaceDivInner(p1, P1_SECOND_PARTY, fitSpan(secondParty, 26));
  if (driverPhone) p1 = replaceDivInner(p1, P1_MOBILE, fitSpan(driverPhone, 10));

  // ---- Page 1 overlays ----
  let ov1 = "";
  // route row: cover baked sample values, overlay real ones
  if (from) {
    ov1 += whiteCover(ROUTE_FROM_BOX.left, ROUTE_ROW.bottom, ROUTE_FROM_BOX.width, ROUTE_ROW.height);
    ov1 += box(ROUTE_FROM_BOX, ROUTE_ROW.textBottom, from);
  }
  if (to) {
    ov1 += whiteCover(ROUTE_TO_BOX.left, ROUTE_ROW.bottom, ROUTE_TO_BOX.width, ROUTE_ROW.height);
    ov1 += box(ROUTE_TO_BOX, ROUTE_ROW.textBottom, to);
  }
  // vehicle details row
  ov1 += box(VEH.type, VEH_BOTTOM, carModel);
  ov1 += box(VEH.plate, VEH_BOTTOM, plate);
  ov1 += box(VEH.driver, VEH_BOTTOM, driverName);
  ov1 += box(VEH.iqama, VEH_BOTTOM, driverIqama);
  ov1 += box(VEH.phone, VEH_BOTTOM, driverPhone);
  // date / notes / trip number cells
  ov1 += box(P1_DATE_CELL, P1_DATE_CELL.bottom, date);
  ov1 += box(P1_NOTES_CELL, P1_NOTES_CELL.bottom, esc(t.notes || ""));
  ov1 += box(P1_TRIPNO_CELL, P1_TRIPNO_CELL.bottom, esc(t.trip_number || ""));
  // passenger rows
  for (let i = 0; i < Math.min(passengers.length, MAX_ROWS); i++) {
    const p = passengers[i] || {};
    ov1 += box(COL_NAME, ROW_BOTTOMS[i], esc(p.name || ""));
    ov1 += box(COL_ID, ROW_BOTTOMS[i], esc(p.id_number || ""));
    ov1 += box(COL_NAT, ROW_BOTTOMS[i], esc(p.nationality || ""));
  }
  p1 = inject(p1, "pf1", ov1);

  // ---- Page 2 overlays: header row + all items marked Sound/OK ----
  let ov2 = "";
  ov2 += box(P2.driver, P2_ROW_BOTTOM, driverName);
  ov2 += box(P2.plate, P2_ROW_BOTTOM, plate);
  ov2 += box(P2.date, P2_ROW_BOTTOM, date);
  ov2 += box(P2.time, P2_ROW_BOTTOM, time);
  for (const b of ITEM_BOTTOMS) {
    ov2 += box(SOUND_COL, b, "\u2713");
  }
  p2 = inject(p2, "pf2", ov2);

  // ---- CSS overrides (same print-safe setup as the other templates) ----
  const extraCss = `
<style>
#sidebar{display:none!important}
#page-container{left:0!important}
.loading-indicator{display:none!important}
.t{overflow:visible!important}
@media screen{.pc{display:block!important;opacity:1!important}}
@media print{
  @page{size:A4;margin:0}
  html,body{width:100%!important;margin:0!important;padding:0!important}
  #page-container{position:static!important;width:100%!important;height:auto!important;overflow:visible!important;background:#fff!important}
  .pf{zoom:0.74;margin:0 auto!important;float:none!important}
}
</style>`;
  head = head.replace("</head>", extraCss + "\n</head>");
  head = head.replace("<title></title>", `<title>${esc(t.trip_name || "Trip Manifest")}</title>`);

  return head + p1 + p2;
}