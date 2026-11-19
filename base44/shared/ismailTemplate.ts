// Muhammad Ismail (محمد إسماعيل) — 3-page contract template (pdf2htmlEX).
//   pf1 = contract: date, second party, from / to
//   pf2 = passenger list: route, date, 12 passenger rows (repeated for longer groups)
//   pf3 = daily vehicle inspection log: time, date
// Driver details (محمد إسماعيل, 2604047221, 2169-JXA, Hyundai Starex)
// are BAKED IN and never overridden.
import { esc } from "./mscTemplate.ts";

export const ISMAIL_TEMPLATE_URL =
  "https://base44.app/api/apps/6a5cef68337f5303ffc014f5/files/mp/public/6a5cef68337f5303ffc014f5/c519eb7d3_ismail_template.html";

// the template fonts only carry the letters of the sample text, so our values use Arial
const ARIAL = "font-family:Arial,Helvetica,sans-serif;font-weight:bold;letter-spacing:normal";

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
    return `${a}t m0 x0 h5 ${c.y || ty} ff3 fs3 fc0 sc0 ls0 ws0" ` +
      `style="left:0;width:266.667%;text-align:center">${c.html}${close}`;
  });
}

// passenger table: the template's own rows and columns
const ROWS = ["y5d", "y60", "y62", "y63", "y64", "y65", "y66", "y67", "y68", "y6a", "y6b", "y6c"];
const COLS = { x55: ["nationality", 12], x70: ["id_number", 12], x16: ["name", 22] };

export function buildFromIsmailTemplate(templateHtml, trip) {
  const t = trip || {};
  const pax = t.passengers || [];
  const up = (s) => String(s || "").replace(/_/g, " ").trim().toUpperCase();
  const dm = /^(\d{4})-(\d{2})-(\d{2})/.exec(t.travel_date || "");
  const date = dm ? `${dm[3]}-${dm[2]}-${dm[1]}` : "";
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

  // ---- page 1: trip values written in place, right where the sample sat ----
  if (date) {
    p1 = p1.replace('28<span class="_ _5"></span>-<span class="ls1">10</span>-2<span class="_ _5"></span>026',
      () => val(date, 12));
  }
  if (party) {
    p1 = p1.replace('ALI ASGHAR /<span class="_ _5"></span> WI<span class="_ _5"></span>TH <span class="_ _5"></span>08 ' +
      '<span class="_ _5"></span>MEM<span class="_ _5"></span>BER<span class="_ _5"></span>S',
      () => val(party, 34));
  }
  if (from) {
    p1 = p1.replace('MA<span class="ls0">KKA<span class="_ _5"></span>H',
      () => val(from, 18));
  }
  if (to) {
    p1 = p1.replace('RI<span class="_ _5"></span>ZWA<span class="_ _5"></span>N',
      () => val(to, 18));
  }

  // ---- page 2: route, date, passengers (driver row stays as printed) ----
  const top = {};
  if (from || to) top["x55 y54"] = { html: val(`${from} TO ${to}`, 30) };
  if (date) top["x5d y54"] = { html: val(date, 12) };
  p2 = setCells(p2, top);

  const pages = [];
  const chunks = Math.max(1, Math.ceil(pax.length / ROWS.length));
  for (let c = 0; c < chunks; c++) {
    const cells = {};
    ROWS.forEach((row, i) => {
      const p = pax[c * ROWS.length + i];
      const n = c * ROWS.length + i + 1;
      cells["x48 " + row] = { html: p ? val(String(n) + ".", 4) : "" };
      for (const x in COLS) {
        cells[x + " " + row] = { html: p ? val(up(p[COLS[x][0]]), COLS[x][1]) : "" };
      }
    });
    pages.push(setCells(p2, cells));
  }

  // ---- page 3: inspection time + date (plate and driver stay as printed) ----
  const log = {};
  if (time) log["x89 y7f"] = { html: val(time, 12) };
  if (date) log["x42 y7f"] = { html: val(date, 12) };
  p3 = setCells(p3, log);

  const css = `
<style>
#sidebar{display:none!important}
#page-container{left:0!important}
.loading-indicator{display:none!important}
@media screen{.pc{display:block!important;opacity:1!important}}
@media print{@page{size:A4;margin:0}}
</style>`;
  head = head
    .replace("</head>", css + "\n</head>")
    .replace("<title></title>", `<title>${esc(t.trip_name || "Trip Manifest")}</title>`);
  return head + p1 + pages.join("") + p3;
}