// Muassasat Taybah Al-Fakhmah (مؤسسة طيبة الفخمة للنقل البرى) manifest builder.
// Uses the company's uploaded text-based pdf2htmlEX template and swaps each
// dynamic field in-place by its pdf2htmlEX class string. 3 pages:
//   p1 = Arabic contract (second party, route, date)
//   p2 = manifest (driver iqamas, plate, passenger names + ids)
//   p3 = inspection log (driver name, plate, date, signature)
// The baked Arabic layout, branding and watermark are preserved.
import { esc } from "./mscTemplate.ts";

export const TAYBAH_TEMPLATE_URL =
  "https://base44.app/api/apps/6a5cef68337f5303ffc014f5/files/mp/public/6a5cef68337f5303ffc014f5/493fa7704_template-1786817164344.txt";

// ---- Page 1 (contract) field classes ----
const P1_SECOND_PARTY = "m0 x1 h3 y2 ff1 fs0 fc0 sc0 ls0 ws0"; // "khalil and 7 members"
const P1_FROM         = "m0 x2 h3 y3 ff1 fs0 fc0 sc0 ls0 ws0"; // "Makkah"
const P1_TO           = "m0 x3 h3 y4 ff1 fs0 fc0 sc0 ls0 ws0"; // "Riyadh"
const P1_DATE         = "m0 x4 h4 y5 ff2 fs1 fc0 sc0 ls0 ws0"; // "15/8/2026"

// ---- Page 2 (manifest) field classes ----
const P2_IQAMA1 = "m0 x5 h5 y6 ff3 fs2 fc0 sc0 ls0 ws0";  // driver 1 iqama
const P2_IQAMA2 = "m0 x5 h6 y7 ff3 fs3 fc0 sc0 ls0 ws0";  // driver 2 iqama
const P2_PLATE  = "m0 x6 h7 y8 ff3 fs4 fc0 sc0 ls0 ws0";  // vehicle plate

// 9 baked passenger-name slots (vertical order)
const P2_PAX_NAMES = [
  "m0 x8 h9 ya ff3 fs5 fc0 sc0 ls0 ws0",
  "m0 x8 h9 yb ff3 fs5 fc0 sc0 ls0 ws0",
  "m0 x8 h9 yc ff3 fs5 fc0 sc0 ls0 ws0",
  "m0 x9 ha yd ff3 fs6 fc0 sc0 ls0 ws0",
  "m0 xa hb ye ff3 fs7 fc0 sc0 ls0 ws0",
  "m0 x8 h9 y10 ff3 fs5 fc0 sc0 ls0 ws0",
  "m0 x8 h9 y11 ff3 fs5 fc0 sc0 ls0 ws0",
  "m0 x8 h9 y12 ff3 fs5 fc0 sc0 ls0 ws0",
  "m0 xb hd y13 ff3 fs8 fc0 sc0 ls0 ws0"
];

// 6 baked passenger-id slots (vertical order)
const P2_PAX_IDS = [
  "m0 xc he y14 ff3 fs9 fc0 sc0 ls0 ws0",
  "m0 xd he y15 ff3 fs9 fc0 sc0 ls0 ws0",
  "m0 xd he y16 ff3 fs9 fc0 sc0 ls0 ws0",
  "m0 xd he y17 ff3 fs9 fc0 sc0 ls0 ws0",
  "m0 xd he y18 ff3 fs9 fc0 sc0 ls0 ws0",
  "m0 xd he y19 ff3 fs9 fc0 sc0 ls0 ws0"
];

const P2_MANIFEST_ID = "m0 xe he y1a ff3 fs9 fc0 sc0 ls0 ws0"; // "ID : 167"

// ---- Page 3 (inspection log) field classes ----
const P3_DRIVER  = "m0 xf hf y1b ff4 fsa fc0 sc0 ls0 ws0"; // driver 1 name
const P3_PLATE   = "m0 x10 h7 y1c ff4 fs4 fc0 sc0 ls0 ws0"; // plate
const P3_DATE    = "m0 x11 h10 y1d ff4 fsb fc0 sc0 ls0 ws0"; // date
const P3_DRIVER2 = "m0 x12 h11 y1e ff4 fsc fc0 sc0 ls0 ws0"; // driver name (signature)

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Replace the inner content of the FIRST div matching a full class string.
function replaceDivInner(html: string, fullClass: string, newInner: string): string {
  const cls = escapeRegex(fullClass);
  return html.replace(
    new RegExp('(<div class="t ' + cls + '"[^>]*>)[\\s\\S]*?(</div>)'),
    "$1" + newInner + "$2"
  );
}

// Template date style: "15/8/2026" (D/M/YYYY)
function fmtDate(d: string): string {
  if (!d) return "";
  const dt = new Date(d + "T00:00:00");
  if (isNaN(dt.getTime())) return String(d);
  return `${dt.getDate()}/${dt.getMonth() + 1}/${dt.getFullYear()}`;
}

// Squeeze a value horizontally so long text stays inside its baked cell.
function fit(text: string, fits: number): string {
  const s = String(text);
  if (s.length <= fits) return s;
  const sx = (fits / s.length).toFixed(3);
  return `<span style="display:inline-block;white-space:nowrap;transform:scaleX(${sx});transform-origin:left center">${s}</span>`;
}

export function buildFromTaybahTemplate(templateHtml: string, trip: any): string {
  const t = trip || {};
  const passengers = t.passengers || [];
  const drivers = t.drivers || [];
  const d1 = drivers[0] || {};
  const d2 = drivers[1] || {};
  const date = fmtDate(t.travel_date);
  const secondParty = esc(t.second_party_name || "");
  const from = esc(t.route_from || "");
  const to = esc(t.route_to || "");
  const iqama1 = esc(d1.iqama_no || "");
  const iqama2 = esc(d2.iqama_no || "");
  const plate = esc(t.vehicle_plate || "");
  const driverName = esc(d1.name || "");
  const driver2Name = esc(d2.name || driverName);

  let html = templateHtml;

  // ---- Page 1: contract (second party blanked when unset so no stale sample) ----
  html = replaceDivInner(html, P1_SECOND_PARTY, secondParty ? fit(secondParty, 24) : " ");
  if (from) html = replaceDivInner(html, P1_FROM, fit(from, 14));
  if (to) html = replaceDivInner(html, P1_TO, fit(to, 14));
  if (date) html = replaceDivInner(html, P1_DATE, date);

  // ---- Page 2: driver iqamas + plate ----
  if (iqama1) html = replaceDivInner(html, P2_IQAMA1, iqama1);
  if (iqama2) html = replaceDivInner(html, P2_IQAMA2, iqama2);
  if (plate) html = replaceDivInner(html, P2_PLATE, plate);

  // ---- Page 2: passenger names (up to 9) ----
  for (let i = 0; i < P2_PAX_NAMES.length; i++) {
    const p = passengers[i] || {};
    const val = p.name ? esc(p.name) : " ";
    html = replaceDivInner(html, P2_PAX_NAMES[i], fit(val, 22));
  }

  // ---- Page 2: passenger ids (up to 6) ----
  for (let i = 0; i < P2_PAX_IDS.length; i++) {
    const p = passengers[i] || {};
    const val = p.id_number ? esc(p.id_number) : " ";
    html = replaceDivInner(html, P2_PAX_IDS[i], val);
  }

  // ---- Page 2: manifest serial (use trip id suffix, else blank the number) ----
  const serial = t.id ? String(t.id).slice(-6).toUpperCase() : "";
  html = replaceDivInner(html, P2_MANIFEST_ID, "ID : " + serial);

  // ---- Page 3: inspection log ----
  if (driverName) html = replaceDivInner(html, P3_DRIVER, fit(driverName, 18));
  if (plate) html = replaceDivInner(html, P3_PLATE, plate);
  if (date) html = replaceDivInner(html, P3_DATE, date);
  if (driver2Name) html = replaceDivInner(html, P3_DRIVER2, fit(driver2Name, 18));

  // ---- CSS overrides (print-safe, same setup as the other templates) ----
  const extraCss = `
<style>
#sidebar{display:none!important}
#page-container{left:0!important}
.loading-indicator{display:none!important}
.t{overflow:visible!important}
@media screen{.pc{display:block!important;opacity:1!important}}
@media print{@page{size:A4;margin:0}}
</style>`;
  html = html.replace("</head>", extraCss + "\n</head>");
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${esc(t.trip_name || "Trip Manifest")}</title>`);

  return html;
}