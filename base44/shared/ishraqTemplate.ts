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

  let natIdx = 0;
  p2 = replaceTDivs(p2, [
    routeReplacer,
    (s) => s === SAMPLE_DATE ? dateTime : null,
    (s) => s === SAMPLE_P2_FOOTER_DATE ? dateTimeNum : null,
    (s) => {
      const i = SAMPLE_NAMES.indexOf(s);
      return i >= 0 ? pax(i, "name") : null;
    },
    (s) => {
      const i = SAMPLE_IDS.indexOf(s);
      return i >= 0 ? pax(i, "id_number") : null;
    },
    (s) => {
      if (NAT_SAMPLES.indexOf(s) >= 0) return pax(natIdx++, "nationality");
      return null;
    }
  ]);

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