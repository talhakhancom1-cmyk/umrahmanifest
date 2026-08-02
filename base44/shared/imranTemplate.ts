// Builds the trip document from the Imran Faqir pdf2htmlEX template.
// The template has 2 pages: page 1 = Arabic contract/declaration, page 2 = manifest table.
// Driver details (IMRAN FAQIR, iqama 2605423462, vehicle 7799 A S A, HYUNDAI FAN) are
// BAKED IN and never overridden — only date, destination, second party and passenger
// data are dynamic.
import { esc } from "./mscTemplate.ts";

export const IMRAN_TEMPLATE_URL =
  "https://media.base44.com/files/public/6a5cef68337f5303ffc014f5/3e5aabc72_IMRAN.html";

// DD/MM/YYYY date format (matches the template's sample "26/07/2026")
function fmtDateDDMMYYYY(d) {
  if (!d) return "";
  const date = new Date(d);
  if (isNaN(date.getTime())) return d;
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Replace the full inner content of a div matched by its unique class string.
function replaceDivInner(html, fullClass, newInner) {
  const cls = escapeRegex(fullClass);
  const re = new RegExp('(<div class="t ' + cls + '"[^>]*>)[\\s\\S]*?(</div>)');
  return html.replace(re, "$1" + newInner + "$2");
}

// Replace only the Latin prefix before the Arabic suffix (<span class="ff2">...),
// preserving the embedded Arabic text that follows "-:".
function replaceLatinPrefix(html, fullClass, newLatin) {
  const cls = escapeRegex(fullClass);
  const re = new RegExp('(<div class="t ' + cls + '"[^>]*>)[\\s\\S]*?(<span class="ff2")');
  return html.replace(re, "$1" + newLatin + " $2");
}

// Page 1 dynamic div classes
const P1_ROUTE_FROM = "m0 xf h2 y14 ff1 fs0 fc0 sc0 ls0 ws0";
const P1_ROUTE_TO = "m0 x10 h2 y5 ff1 fs0 fc0 sc0 ls0 ws0";
const P1_SECOND_PARTY = "m0 x14 h2 y18 ff1 fs0 fc0 sc0 ls0 ws0";
const P1_DATE = "m0 x1f h3 y1 ff1 fs0 fc0 sc0 ls0 ws0";

// Page 2 dynamic div classes
const P2_DATE_TIME_DEST = "m0 x32 h10 y3b ff1 fs3 fc0 sc0 ls0 ws0";

// Existing passenger div classes (visual top-to-bottom; row 3 is split name+id).
// These are blanked out so a clean 3-cell overlay can replace them with perfect
// column alignment regardless of name length.
const PAX_DIV_CLASSES = [
  "m0 x31 h13 y19 ff5 fs3 fc0 sc0 ls0 ws0",
  "m0 x2d h13 y2 ff5 fs3 fc0 sc0 ls0 ws0",
  "m0 x2e h13 y39 ff5 fs3 fc0 sc0 ls0 ws0",
  "m0 x2f h13 y18 ff5 fs3 fc0 sc0 ls0 ws0",
  "m0 x2c h13 y3 ff5 fs3 fc0 sc0 ls0 ws0",
  "m0 x2b h13 y17 ff5 fs3 fc0 sc0 ls0 ws0",
  "m0 x2a h13 y15 ff5 fs3 fc0 sc0 ls0 ws0",
  "m0 x2b h13 y4 ff5 fs3 fc0 sc0 ls0 ws0",
  "m0 x29 h13 y5 ff5 fs3 fc0 sc0 ls0 ws0",
  "m0 x27 h13 y6 ff5 fs3 fc0 sc0 ls0 ws0",
  "m0 x28 h13 y14 ff5 fs3 fc0 sc0 ls0 ws0"
];

// Row bottom positions (px) for the 12 manifest rows, measured from the template.
const ROW_BOTTOMS = [
  731.34, 698.04, 664.92, 631.44, 598.14, 564.84,
  531.54, 498.24, 464.94, 431.64, 399.42, 366.12
];

// Passenger table column boxes (px): [left, width]
const COL_NAME = [188, 295];
const COL_ID = [500, 150];
const COL_NAT = [660, 210];

function paxCell(col, bottom, text, align) {
  return `<div class="t ff5 fs3 fc0 sc0" style="left:${col[0]}px;bottom:${bottom}px;width:${col[1]}px;text-align:${align};white-space:pre;overflow:visible;z-index:9">${text}</div>`;
}

export function buildFromImranTemplate(templateHtml, trip) {
  const t = trip || {};
  const passengers = t.passengers || [];
  const date = fmtDateDDMMYYYY(t.travel_date);
  const time = esc((t.trip_time || "").toUpperCase());
  const from = esc((t.route_from || "").toUpperCase());
  const to = esc((t.route_to || "").toUpperCase());
  const route = from && to ? `${from} TO ${to}` : "";
  const leader = esc((passengers[0] || {}).name || "");
  const secondParty = leader
    ? `${leader} / WITH ${String(Math.max(passengers.length - 1, 0)).padStart(2, "0")} MEMBERS`
    : esc(t.second_party_name || "");

  // Split into head + page1 + page2
  const parts = templateHtml.split(/(<div id="pf[12]")/);
  let head = parts[0];
  let p1 = (parts[1] || "") + (parts[2] || "");
  let p2 = (parts[3] || "") + (parts[4] || "");

  // ---- Page 1: route cities + second party (Latin prefix, keep Arabic suffix) + date ----
  p1 = replaceLatinPrefix(p1, P1_ROUTE_FROM, `   ${from}  `);
  p1 = replaceLatinPrefix(p1, P1_ROUTE_TO, `   ${to}  `);
  p1 = replaceLatinPrefix(p1, P1_SECOND_PARTY, `  ${secondParty}  `);
  p1 = replaceDivInner(p1, P1_DATE, date);

  // ---- Page 2: date / time / destination ----
  p2 = replaceDivInner(
    p2,
    P2_DATE_TIME_DEST,
    `${date}<span class="_ _16"> </span>${time}<span class="_ _17"> </span>${route} `
  );

  // ---- Page 2: blank the existing passenger divs ----
  for (const cls of PAX_DIV_CLASSES) {
    p2 = replaceDivInner(p2, cls, " ");
  }

  // ---- Page 2: inject a clean 3-cell overlay for up to 12 passenger rows ----
  let overlay = "";
  for (let i = 0; i < Math.min(passengers.length, ROW_BOTTOMS.length); i++) {
    const p = passengers[i] || {};
    const bottom = ROW_BOTTOMS[i];
    overlay += paxCell(COL_NAME, bottom, ` ${esc(p.name || "")} `, "left");
    overlay += paxCell(COL_ID, bottom, ` ${esc(p.id_number || "")} `, "center");
    overlay += paxCell(COL_NAT, bottom, ` ${esc(p.nationality || "")} `, "center");
  }
  if (overlay) {
    // Anchor the overlay inside the page 2 page container so absolute positions
    // resolve against the page box in both screen and print.
    const grid = `<div class="b44-grid" style="position:absolute;left:0;bottom:0;width:100%;height:100%;overflow:visible;z-index:9">${overlay}</div>`;
    p2 = p2.replace(/(<div class="pc pc2 w0 h0">)/, `$1${grid}`);
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