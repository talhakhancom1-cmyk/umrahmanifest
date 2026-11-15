// Anjum Transport (مؤسسة أنجم للنقل البري) — 3-page contract template (pdf2htmlEX).
//   pf1 = contract: date, second party, from / to
//   pf2 = passenger list: date, time, from / to, 12 passenger rows (repeated for longer groups)
//   pf3 = daily vehicle inspection log: time, date
// Driver details (منظور خان عمر فاروق, 2577849066, 1412-HSA, Hyundai Staria)
// are BAKED IN and never overridden.
import { esc, fmtDate } from "./mscTemplate.ts";

export const ANJUM_TEMPLATE_URL =
  "https://base44.app/api/apps/6a5cef68337f5303ffc014f5/files/mp/public/6a5cef68337f5303ffc014f5/9948a1a45_anjum_template.txt";

// the template fonts only carry the letters of the sample text, so our values use Arial
const ARIAL = "font-family:Arial,Helvetica,sans-serif;font-weight:bold";

// value for a table cell, shrunk when longer than the cell can hold
function val(s, max) {
  const k = s.length > max ? Math.max(55, Math.round((95 * max) / s.length)) : 95;
  return `<span style="${ARIAL};font-size:${k}%">${esc(s)}</span>`;
}

// first text line of a table cell: container classes + the line's own vertical class
const CELL = /(<div class="c (x\w+) (y\w+) [^"]*"><div class=")t [^"]*\b(y\w+)[^"]*">[\s\S]*?(<\/div>)/g;

// cells: "column row" -> { html, y? } ; the value is centred in its cell
function setCells(page, cells) {
  return page.replace(CELL, (m, a, x, y, ty, close) => {
    const c = cells[x + " " + y];
    if (!c) return m;
    return `${a}t m0 x0 h10 ${c.y || ty} ff9 fs4 fc0 sc0 ls0 ws0" ` +
      `style="left:0;width:266.667%;text-align:center">${c.html}${close}`;
  });
}

// passenger table: [row class, text line class] and the three columns
const ROWS = [["y27", "y28"], ["y29", "y2a"], ["y2b", "y28"], ["y2c", "y2d"], ["y2e", "y28"], ["y2f", "y30"],
  ["y31", "y28"], ["y32", "y2d"], ["y33", "y34"], ["y35", "y2d"], ["y36", "y2d"], ["y38", "y34"]];
const COLS = { x1d: ["nationality", 17], x1c: ["id_number", 18], x20: ["name", 24] };

// value drawn on the contract page, ending just before its Arabic label
const over = (edge, bottom, s, align = "right") =>
  `<div class="b44-cell" style="position:absolute;left:${align === "right" ? edge - 320 : edge}px;bottom:${bottom}px;width:320px;` +
  `text-align:${align};font-size:17px;line-height:1;white-space:nowrap;${ARIAL};color:#000;z-index:9">${esc(s)}</div>`;

export function buildFromAnjumTemplate(templateHtml, trip) {
  const t = trip || {};
  const pax = t.passengers || [];
  const up = (s) => String(s || "").replace(/_/g, " ").trim().toUpperCase();
  const date = fmtDate(t.travel_date);
  const time = up(t.trip_time);
  const from = up(t.route_from);
  const to = up(t.route_to);
  const party = up(t.second_party_name || (pax[0] || {}).name);

  const html = templateHtml.replace(/<script[\s\S]*?<\/script>/g, "");
  const parts = html.split(/(<div id="pf[123]")/);
  let head = parts[0];
  let p1 = (parts[1] || "") + (parts[2] || "");
  let p2 = (parts[3] || "") + (parts[4] || "");
  let p3 = (parts[5] || "") + (parts[6] || "");

  // ---- page 1: the sample value is hidden in place (keeps the line's spacing)
  // and the trip value is drawn over it ----
  let over1 = "";
  const swap = (samples, edge, bottom, value, align) => {
    if (!value) return;
    for (const s of samples) p1 = p1.replace(s, (m) => `<span class="b44h">${m}</span>`);
    over1 += over(edge, bottom, value, align);
  };
  swap(['<span class="ls1">28</span><span class="ff1">-</span>O<span class="_ _2"></span>ct<span class="ff1">-</span><span class="ls1">26</span>'],
    690, 1002, date, "left");
  swap(['J<span class="_ _1"></span>AMEEL AHMED'], 659, 724, party);
  swap(['MAKKAH  TO<span class="_ _1"></span> T<span class="_ _13"></span>AIF'], 696, 579, from);
  swap([/MAKKAH(?=<span class="ls5">)/, 'ZEY<span class="_ _13"></span>ARA<span class="_ _13"></span>T'], 676, 537, to);
  p1 = p1.replace(/(<div class="pc[^"]*">)/, (m) => m + over1);

  // ---- page 2: route, time, date, passengers ----
  const top = {};
  if (from) top["x32 y3a"] = { html: val(from, 17) };
  if (to) top["x2e y3a"] = { html: val(to, 18) };
  if (time) top["x35 y41"] = { html: val(time, 16) };
  if (date) top["x37 y41"] = { html: val(date, 11) };
  p2 = setCells(p2, top);

  const pages = [];
  const chunks = Math.max(1, Math.ceil(pax.length / ROWS.length));
  for (let c = 0; c < chunks; c++) {
    const cells = {};
    ROWS.forEach(([row, y], i) => {
      const p = pax[c * ROWS.length + i];
      for (const x in COLS) {
        cells[x + " " + row] = { y, html: p ? val(up(p[COLS[x][0]]), COLS[x][1]) : "" };
      }
    });
    pages.push(setCells(p2, cells));
  }

  // ---- page 3: inspection time + date ----
  const log = {};
  if (time) log["x47 y4c"] = { html: val(time, 12) };
  if (date) log["x4a y4c"] = { html: val(date, 11) };
  p3 = setCells(p3, log);

  const css = `
<style>
#sidebar{display:none!important}
#page-container{left:0!important}
.loading-indicator{display:none!important}
.b44h{visibility:hidden}
@media screen{.pc{display:block!important;opacity:1!important}}
@media print{@page{size:A4;margin:0}
/* the template switches to pt sizes in print (1px -> 0.8889pt); scale our overlays the same way */
.b44-cell{zoom:1.185185}}
</style>`;
  head = head
    .replace("</head>", css + "\n</head>")
    .replace("<title></title>", `<title>${esc(t.trip_name || "Trip Manifest")}</title>`);
  return head + p1 + pages.join("") + p3;
}