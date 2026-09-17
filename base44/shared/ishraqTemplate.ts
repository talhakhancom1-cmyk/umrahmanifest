// Builds the trip document from the Ishraq Qafila Rahlah pdf2htmlEX template.
// 3 pages: page 1 = contract (Arabic declaration), page 2 = manifest table,
// page 3 = inspection. Sample values are baked into the text layer; dynamic
// values are swapped in-place (same approach as saudTemplate / mscTemplate).
import { esc, replaceTDivs, centered, fmtDate } from "./mscTemplate.ts";

export const ISHRAQ_TEMPLATE_URL =
  "https://media.base44.com/files/public/6a5cef68337f5303ffc014f5/9ae6f6c19_ISHRAQQAFILARAHLAH25A.html";

// Numeric date (DD-MM-YY) used by the template's footer + inspection page
function fmtDateNum(d) {
  if (!d) return "";
  const date = new Date(d);
  if (isNaN(date.getTime())) return "";
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  return `${dd}-${mm}-${String(date.getFullYear()).slice(-2)}`;
}

// Sample values baked into the template's text layer
const SAMPLE_DRIVER = "ISHRAQ ALI HALEEM GUL";
const SAMPLE_IQAMA = "2306370004";
const SAMPLE_DATE = "13-Oct-24";          // page 2 top header date
const SAMPLE_P2_FOOTER_DATE = "25-07-26"; // page 2 LOCATION/DATE footer (hyphens)
const SAMPLE_P3_DATE = "25_07_26";        // page 3 inspection date (underscores)
const SAMPLE_PLATE = "5621-LSA";

const SAMPLE_NAMES = [
  "SABIR",
  "SAEED MUHAMMAD",
  "BA MARMUZ",
  "HADEGA",
  "WAFA",
  "YASER",
  "ZINAB"
];
const SAMPLE_IDS = [
  "2518230400", "269368589", "15531934", "16477378",
  "12425972", "12426142", "12426143"
];
const NAT_SAMPLES = ["PAKISTAN", "YEM"];

// Page geometry (px) of the template's pages, used to express overlay
// positions as media-independent percentages.
const PAGE_W = 892;
const PAGE_H = 1263;
const pct = (v, ref) => (v / ref * 100).toFixed(4) + "%";

export function buildFromIshraqTemplate(templateHtml, trip) {
  const t = trip || {};
  const date = fmtDate(t.travel_date);
  const time = esc(t.trip_time || "");
  const from = esc((t.route_from || "").toUpperCase());
  const to = esc((t.route_to || "").toUpperCase());
  const d1 = (t.drivers || [])[0] || {};
  const passengers = t.passengers || [];

  // Split into head + pages
  const parts = templateHtml.split(/(<div id="pf[123]")/);
  let head = parts[0];
  let p1 = (parts[1] || "") + (parts[2] || "");
  let p2 = (parts[3] || "") + (parts[4] || "");
  let p3 = (parts[5] || "") + (parts[6] || "");

  const pax = (i, field) => esc(((passengers[i] || {})[field]) || "");

  const dateNum = fmtDateNum(t.travel_date);
  const dateTime = `${date}${time ? " " + time : ""}`;
  const dateTimeNum = `${dateNum}${time ? " " + time : ""}`;
  const dateTimeNumUs = `${dateNum.split("-").join("_")}${time ? " " + time : ""}`;

  // Route text is split across many letter-spans in the pdf2htmlEX layer, so raw
  // string split/join can't match it. Match the full plain-text route divs instead.
  const routeReplacer = (s) =>
    (s === "JEDDAH TO RIYADH" || s === "MADINA TO MAKKAH")
      ? `${from} TO ${to}` : null;

  // The top route may sit on page 1 or 2 — run it everywhere to be safe.
  p1 = replaceTDivs(p1, [routeReplacer]);

  // The template's passenger text layer is irregular — nationalities sit in two
  // different columns, the first row's name is merged into "PAKISTANSABIR", and
  // the nationality/name/id columns aren't aligned by index. So blank every
  // sample passenger cell and overlay a clean grid cloned from the template's
  // own row-1 cells (nationality / id / name), so columns line up exactly.
  const PAX_SAMPLES = [
    ...SAMPLE_NAMES, ...SAMPLE_IDS, ...NAT_SAMPLES, "PAKISTANSABIR"
  ];
  // Vehicle row: driver name / plate / car model are baked as plain text.
  const squeeze = (s, fits) => s.length <= fits ? s
    : `<span style="display:inline-block;white-space:nowrap;transform:scaleX(${(fits / s.length).toFixed(3)});transform-origin:left center">${s}</span>`;
  if (d1.name) p2 = p2.split(`>${SAMPLE_DRIVER} </div>`).join(`>${squeeze(esc(d1.name.toUpperCase()), 18)} </div>`);
  if (t.vehicle_plate) p2 = p2.split(`>RAR <span class="ls9">5716</span> </div>`).join(`>${squeeze(esc(t.vehicle_plate.toUpperCase()), 12)} </div>`);
  if (t.car_model) p2 = p2.split(`>TOY0TA HI ACE </span></div>`).join(`>${squeeze(esc(t.car_model.toUpperCase()), 16)} </span></div>`);

  p2 = replaceTDivs(p2, [
    routeReplacer,
    (s) => s === SAMPLE_DATE ? dateTime : null,
    (s) => s === SAMPLE_P2_FOOTER_DATE ? dateTimeNum : null,
    (s) => PAX_SAMPLES.indexOf(s) >= 0 ? "" : null
  ]);

  // Row bottoms (px) for manifest rows 1..14, measured from the template's own
  // row-number cells. Column container + text classes cloned from the row-1
  // sample cells so added rows share the template's exact typography/position.
  const ROW_BOTTOM = {
    1: 846.105, 2: 812.085, 3: 774.645, 4: 741.345, 5: 707.325, 6: 673.845,
    7: 639.825, 8: 602.565, 9: 575.175, 10: 541.875, 11: 508.395, 12: 474.375,
    13: 440.535, 14: 406.515
  };
  // Column boxes (px) measured from the template's own row-1 cells. Positions
  // are emitted as percentages of the page so the overlay lands identically on
  // screen and in print (the template's print stylesheet re-declares its layout
  // in pt at a different scale, so inline px would drift down the page).
  const COL = {
    nat:  { left: 52, width: 142 },
    id:   { left: 194, width: 272 },
    name: { left: 466, width: 382 }
  };
  const IQAMA_CELL = { left: 41, width: 243, bottom: 987, size: 15 };
  const mkCell = (col, bottom, text, size) =>
    `<div class="b44-cell" style="position:absolute;left:${pct(col.left, PAGE_W)};bottom:${pct(bottom, PAGE_H)};` +
    `width:${pct(col.width, PAGE_W)};text-align:center;font-family:Arial,Helvetica,sans-serif;` +
    `font-weight:700;font-size:${size || 13}px;color:#000;z-index:9">${text}</div>`;

  let overlay = "";
  // Driver iqama — the template's own iqama cell is blank; fill it with the
  // trip's driver iqama, falling back to the template's baked driver.
  overlay += mkCell(IQAMA_CELL, IQAMA_CELL.bottom, esc(d1.iqama_no || SAMPLE_IQAMA), IQAMA_CELL.size);
  for (let i = 0; i < passengers.length && i < 14; i++) {
    const b = ROW_BOTTOM[i + 1];
    if (b === undefined) break;
    // container bottom -> vertically centred text baseline inside the row
    const tb = b + 11;
    overlay += mkCell(COL.nat, tb, pax(i, "nationality"));
    overlay += mkCell(COL.id, tb, pax(i, "id_number"));
    overlay += mkCell(COL.name, tb, pax(i, "name"));
  }
  if (overlay) {
    const grid = `<div class="b44-grid" style="position:absolute;left:0;bottom:0;width:100%;height:100%;overflow:visible;z-index:9">${overlay}</div>`;
    p2 = p2.split('<div class="pc pc2 w0 h0">')
      .join('<div class="pc pc2 w0 h0">' + grid);
  }

  // ---- Page 3 (inspection): route + date (numeric, underscores) ----
  p3 = replaceTDivs(p3, [
    routeReplacer,
    (s) => s === SAMPLE_P3_DATE ? dateTimeNumUs : null
  ]);

  // ---- CSS overrides ----
  const extraCss = `
<style>
#sidebar{display:none!important}
#page-container{left:0!important}
.loading-indicator{display:none!important}
@media screen{.pc{display:block!important;opacity:1!important}}
@media print{@page{size:A4;margin:0}}
</style>`;
  head = head.replace("</head>", extraCss + "\n</head>");
  head = head.replace("<title></title>", `<title>${esc(t.trip_name || "Trip Manifest")}</title>`);

  return head + p1 + p2 + p3;
}