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

// Page geometry: the template page is 1860.75 x 2630.25 px, far wider than A4,
// which is why it printed zoomed across 6 sheets. Scale it down to A4 width.
const PAGE_ZOOM = (793.7 / 1860.75).toFixed(4); // ~0.4265

// ---- Page 2: 7 passenger rows (name + id), paired by measured row position ----
// Driver names/iqamas and the plate are left exactly as the original PDF has them.
const P2_PAX_NAMES = [
  "m0 x8 h9 ya ff3 fs5 fc0 sc0 ls0 ws0",
  "m0 x8 h9 yb ff3 fs5 fc0 sc0 ls0 ws0",
  "m0 x8 h9 yc ff3 fs5 fc0 sc0 ls0 ws0",
  "m0 x8 h9 y10 ff3 fs5 fc0 sc0 ls0 ws0",
  "m0 x8 h9 y11 ff3 fs5 fc0 sc0 ls0 ws0",
  "m0 x8 h9 y12 ff3 fs5 fc0 sc0 ls0 ws0",
  "m0 xb hd y13 ff3 fs8 fc0 sc0 ls0 ws0"
];

const P2_PAX_IDS = [
  "m0 xc he y14 ff3 fs9 fc0 sc0 ls0 ws0",
  "m0 xd he y15 ff3 fs9 fc0 sc0 ls0 ws0",
  "m0 xd he y16 ff3 fs9 fc0 sc0 ls0 ws0",
  "m0 xd he y17 ff3 fs9 fc0 sc0 ls0 ws0",
  "m0 xd he y18 ff3 fs9 fc0 sc0 ls0 ws0",
  "m0 xd he y19 ff3 fs9 fc0 sc0 ls0 ws0",
  "m0 xe he y1a ff3 fs9 fc0 sc0 ls0 ws0"
];

// ---- Page 3 (inspection log) field classes ----
const P3_DATE = "m0 x11 h10 y1d ff4 fsb fc0 sc0 ls0 ws0"; // date

// The template page carries a full-page background raster that still shows the
// original sample passenger names/ids, so those two columns are masked white
// (row by row, inside the grid lines) before our values are drawn on top.
const PAGE_W = 1860.75;
const PAGE_H = 2630.25;
// Row grid lines start at y=986 with a 79.7px pitch; masks stay inside the
// lines so the printed table borders survive.
const ROW_LINE0 = 986;
const ROW_PITCH = 79.7;
const ROW_COUNT = 7;
const MASK_COLS = [
  { left: 55, width: 895 },   // id / passport column interior
  { left: 972, width: 690 }   // name column interior
];

function buildPaxMask(): string {
  const pctW = (v: number) => (v / PAGE_W * 100).toFixed(4) + "%";
  const pctH = (v: number) => (v / PAGE_H * 100).toFixed(4) + "%";
  let rects = "";
  for (let i = 0; i < ROW_COUNT; i++) {
    const top = ROW_LINE0 + i * ROW_PITCH + 4;
    for (const col of MASK_COLS) {
      rects += `<div style="position:absolute;left:${pctW(col.left)};top:${pctH(top)};width:${pctW(col.width)};height:${pctH(71)};background:#fff"></div>`;
    }
  }
  return `<div class="b44-mask" style="position:absolute;left:0;top:0;width:100%;height:100%;z-index:2">${rects}</div>`;
}

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
  let html = templateHtml;

  // ---- Page 1: contract (second party blanked when unset so no stale sample) ----
  html = replaceDivInner(html, P1_SECOND_PARTY, secondParty ? fit(secondParty, 24) : " ");
  if (from) html = replaceDivInner(html, P1_FROM, fit(from, 14));
  if (to) html = replaceDivInner(html, P1_TO, fit(to, 14));
  if (date) html = replaceDivInner(html, P1_DATE, date);

  // ---- Page 2: white out the baked passenger cells drawn in the page raster ----
  const p2Idx = html.indexOf('<div id="pf2"');
  if (p2Idx >= 0) {
    const before = html.slice(0, p2Idx);
    // insert right AFTER the page's background raster so the mask paints over
    // it, while all text divs (which follow) still paint above the mask
    const after = html.slice(p2Idx).replace(/(<img\b[^>]*>)/, "$1" + buildPaxMask());
    html = before + after;
  }

  // ---- Page 2: passenger rows (name + id paired on the same row, 7 rows) ----
  for (let i = 0; i < P2_PAX_NAMES.length; i++) {
    const p = passengers[i] || {};
    html = replaceDivInner(html, P2_PAX_NAMES[i], p.name ? fit(esc(p.name), 22) : " ");
    html = replaceDivInner(html, P2_PAX_IDS[i], p.id_number ? fit(esc(p.id_number), 14) : " ");
  }

  // ---- Page 3: inspection log date (driver + plate stay as in the original) ----
  if (date) html = replaceDivInner(html, P3_DATE, date);

  // ---- CSS overrides (print-safe, same setup as the other templates) ----
  const extraCss = `
<style>
#sidebar{display:none!important}
#page-container{left:0!important}
.loading-indicator{display:none!important}
.t{overflow:visible!important}
/* keep the white masks above the page raster, and all text above the masks */

/* The source page is 1860px wide — scale it down so one page = one A4 sheet */
.pf{zoom:${PAGE_ZOOM}}
@media screen{.pc{display:block!important;opacity:1!important}}
@media print{@page{size:A4;margin:0}html,body{margin:0}.pf{zoom:${PAGE_ZOOM};page-break-after:always}}
</style>`;
  html = html.replace("</head>", extraCss + "\n</head>");
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${esc(t.trip_name || "Trip Manifest")}</title>`);

  return html;
}