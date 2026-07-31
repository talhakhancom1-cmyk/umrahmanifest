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
  const COL = {
    nat:  { c: "c x58 y8c w22 h30", t: "t m0 x5c h22 y8d ff6 fs1 fc0 sc0 ls0 ws0" },
    id:   { c: "c x59 y8c w23 h30", t: "t m0 x30 h22 y8d ff6 fs1 fc0 sc0 lsb ws0" },
    name: { c: "c x5a y8c w24 h30", t: "t m0 x5d h22 y8d ff6 fs1 fc0 sc0 ls0 ws0" }
  };
  const mkCell = (col, bottom, text) =>
    `<div class="${col.c}" style="bottom:${bottom}px;z-index:9">` +
    `<div class="${col.t}">${text}</div></div>`;

  let overlay = "";
  for (let i = 0; i < passengers.length && i < 14; i++) {
    const b = ROW_BOTTOM[i + 1];
    if (b === undefined) break;
    overlay += mkCell(COL.nat, b, pax(i, "nationality"));
    overlay += mkCell(COL.id, b, pax(i, "id_number"));
    overlay += mkCell(COL.name, b, pax(i, "name"));
  }
  if (overlay) {
    p2 = p2.split('<div class="pc pc2 w0 h0">')
      .join('<div class="pc pc2 w0 h0">' + overlay);
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