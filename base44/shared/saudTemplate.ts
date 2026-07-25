// Builds the trip document from the Saud Munir al-Hudhali pdf2htmlEX template.
// The template has 2 pages: page 1 = contract/declaration, page 2 = manifest table.
// Static Arabic layout lives in per-page background images; dynamic Latin values
// are swapped in-place inside the text layer (same approach as mscTemplate).
import { esc, replaceTDivs, centered } from "./mscTemplate.ts";

export const SAUD_TEMPLATE_URL =
  "https://media.base44.com/files/public/6a5cef68337f5303ffc014f5/b2ff5412b_AHMED86842.html";

// Date format: DD/MM/YYYY (as used in this template)
function fmtDateSlash(d) {
  if (!d) return "";
  const date = new Date(d);
  if (isNaN(date.getTime())) return d;
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = String(date.getFullYear());
  return `${dd}/${mm}/${yyyy}`;
}

// Sample values baked into the template's text layer
const SAMPLE_DRIVER = "AHMAD ALI ALI KHAN";
const SAMPLE_IQAMA = "2529383553";
const SAMPLE_PLATE = "A S A 8684";
const SAMPLE_NAMES = [
  "WAJID ALI AMIN KHAN",
  "TASBEEH ULLAH AMIR ULLAH",
  "GUL SHAHEEN SHIREEN KHAN",
  "JIBRAIL HUSSAIN ZADA",
  "MEHMOOD KHAN FAZAL AHMAD",
  "SALIH MUHAMMAD",
  "DINAR KHAN SARWAR KHAN",
  "MUHAMMAD ABDULLAH KHALIL UR REHMAN"
];
const SAMPLE_IDS = [
  "2572380380", "2531334213", "2513864880", "2575755315",
  "2587916566", "RJ0157852", "2550745612", "2574358699"
];

// Table geometry (px) — rows 9-12 have no sample text, need overlay cells.
// Container bottoms for rows 9-12, +~24.5 text y-offset within container.
const ROW_BOTTOMS_9_12 = [314.0, 273.0, 232.0, 191.0];
const COL_NAME = [417.03, 440.1];
const COL_NAT = [288.825, 127.476];
const COL_ID = [96.876, 191.235];

function overlayCell(col, bottom, text) {
  return `<div class="b44-cell" style="position:absolute;left:${col[0]}px;bottom:${bottom}px;width:${col[1]}px;` +
    `text-align:center;font-family:Arial,Helvetica,sans-serif;font-weight:700;font-size:14px;color:#000;z-index:9">${text}</div>`;
}

// Strip private-use Unicode glyphs (Arabic font encoding) for text matching
function clean(s) {
  return s.replace(/[\ue000-\uf8ff]/g, "").trim();
}

export function buildFromSaudTemplate(templateHtml, trip) {
  const t = trip || {};
  const date = fmtDateSlash(t.travel_date);
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

  // ---- Page 1: date/time + destination ----
  // The date/time div contains Arabic glyphs + "20/07/2025" + "11:57".
  // Replace the entire content with formatted date + time.
  p1 = replaceTDivs(p1, [
    (s) => s.includes("11:57") && s.includes("2025") ? `${date}    ${time}` : null,
  ]);
  // Destination cities are plain Latin text embedded in Arabic spans
  p1 = p1.split("TAIF").join(from);
  p1 = p1.split("AL QASSEM").join(to);

  // ---- Page 2: header (driver name, iqama, plate) ----
  const pax = (i, field) => esc(((passengers[i] || {})[field]) || "");
  p2 = replaceTDivs(p2, [
    (s) => clean(s) === SAMPLE_DRIVER ? centered(esc(d1.name || "")) : null,
    (s) => clean(s) === SAMPLE_IQAMA ? centered(esc(d1.iqama_no || "")) : null,
    (s) => clean(s) === SAMPLE_PLATE ? centered(esc(t.vehicle_plate || "")) : null,
  ]);

  // ---- Page 2: passenger rows 1-8 ----
  let natIdx = 0;
  p2 = replaceTDivs(p2, [
    (s) => {
      const idx = SAMPLE_NAMES.indexOf(clean(s));
      return idx >= 0 ? centered(pax(idx, "name")) : null;
    },
    (s) => {
      const idx = SAMPLE_IDS.indexOf(clean(s));
      return idx >= 0 ? centered(pax(idx, "id_number")) : null;
    },
    (s) => {
      if (clean(s) === "PAKISTAN") {
        const nat = pax(natIdx, "nationality");
        natIdx++;
        return centered(nat);
      }
      return null;
    },
  ]);

  // ---- Page 2: extra passengers (rows 9-12) via overlay cells ----
  let extraCells = "";
  for (let i = 8; i < 12 && i < passengers.length; i++) {
    const p = passengers[i] || {};
    const bottom = ROW_BOTTOMS_9_12[i - 8];
    extraCells += overlayCell(COL_NAME, bottom, esc(p.name || ""));
    extraCells += overlayCell(COL_NAT, bottom, esc(p.nationality || ""));
    extraCells += overlayCell(COL_ID, bottom, esc(p.id_number || ""));
  }
  if (extraCells) {
    p2 = p2.replace(/(<div class="pc[^"]*">)/, `$1${extraCells}`);
  }

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

  return head + p1 + p2;
}