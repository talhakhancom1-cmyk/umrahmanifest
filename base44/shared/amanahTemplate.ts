// Amanah Fleet (شركة أمانة فليت) — 3-page contract template (pdf2htmlEX).
//   pf1 = contract: date, second party, from / to
//   pf2 = passenger data: driver row, route, date, 12 passenger rows (repeated for longer groups)
//   pf3 = daily vehicle inspection log: time, date, plate, driver
// Driver details fall back to the baked-in ones when the trip has no driver.
import { esc, replaceTDivs, centered } from "./mscTemplate.ts";

export const AMANAH_TEMPLATE_URL =
  "https://base44.app/api/apps/6a5cef68337f5303ffc014f5/files/mp/public/6a5cef68337f5303ffc014f5/5d349a526_amanah_fleet_template.txt";

// the template fonts only carry the letters of the sample text, so our values use Arial
const ARIAL = "font-family:Arial,Helvetica,sans-serif;font-weight:bold";
const CENTER = '" style="left:0;width:266.667%;text-align:center">';

// value for a table cell, shrunk when longer than the cell can hold
function val(s, max) {
  const k = s.length > max ? Math.max(55, Math.round((90 * max) / s.length)) : 90;
  return `<span style="${ARIAL};font-size:${k}%">${esc(s)}</span>`;
}

// value written inside a line of the contract body (page 1)
const inRun = (s) => `<span style="${ARIAL}">${esc(s)}</span>`;

// same value for the downloadable PDF, which cannot read the contract body lines
const pdfOnly = (left, bottom, s) =>
  `<div class="b44-cell" style="display:none;left:${left}px;bottom:${bottom}px;width:300px;` +
  `text-align:center;font-size:16px">${esc(s)}</div>`;

// passenger table: row and column classes of the template's own cells
const ROWS = ["y3a", "y3d", "y3e", "y41", "y45", "y4a", "y4f", "y50", "y52", "y57", "y5c", "y5d"];
const COLS = { x3c: ["nationality", 13], x3d: ["id_number", 13], x3f: ["name", 29] };
const CELL = /(<div class="c (x\w+) (y\w+) [^"]*"><div class=")(t [^"]+)">([\s\S]*?)(<\/div>)/g;

function fillList(page, pax, offset) {
  // vertical position of each row's text, taken from its passport cell
  const rowY = {};
  page.replace(CELL, (m, a, x, y, tCls) => {
    if (x === "x3d") rowY[y] = (tCls.match(/\by\w+/) || [])[0];
    return m;
  });
  let out = page.replace(CELL, (m, a, x, y, tCls, inner, close) => {
    const row = ROWS.indexOf(y);
    const col = COLS[x];
    if (row < 0 || !col) return m;
    const p = pax[row];
    const text = p ? val(String(p[col[0]] || "").toUpperCase(), col[1]) : "";
    return `${a}t m0 x0 h12 ${rowY[y]} ff8 fs2 fc0 sc0 ls0 ws0${CENTER}${text}${close}`;
  });
  if (offset) {
    out = replaceTDivs(out, [
      (s) => (/^\d{1,2}\.$/.test(s) ? `${offset + parseInt(s, 10)}.` : null)
    ]);
  }
  return out;
}

export function buildFromAmanahTemplate(templateHtml, trip) {
  const t = trip || {};
  const pax = t.passengers || [];
  const drv = (t.drivers && t.drivers[0]) || {};
  const up = (s) => String(s || "").replace(/_/g, " ").trim().toUpperCase();
  const dm = /^(\d{4})-(\d{2})-(\d{2})/.exec(t.travel_date || "");
  const date = dm ? `${dm[3]}-${dm[2]}-${dm[1]}` : "";
  const from = up(t.route_from);
  const to = up(t.route_to);
  const time = up(t.trip_time);
  const party = up(t.second_party_name || (pax[0] || {}).name);
  const hasDriver = !!drv.name;
  const driverName = up(drv.name);
  const plate = up(t.vehicle_plate || drv.vehicle_plate);

  const html = templateHtml.replace(/<script[\s\S]*?<\/script>/g, "");
  const parts = html.split(/(<div id="pf[123]")/);
  let head = parts[0];
  let p1 = (parts[1] || "") + (parts[2] || "");
  let p2 = (parts[3] || "") + (parts[4] || "");
  let p3 = (parts[5] || "") + (parts[6] || "");

  // ---- page 1: contract ----
  let pdf1 = "";
  if (dm) {
    p1 = p1.replace('28<span class="ls0">-</span>10<span class="ls0">-2026',
      () => `${dm[3]}<span class="ls0">-</span>${dm[2]}<span class="ls0">-${dm[1]}`);
    pdf1 += pdfOnly(564, 928, date);
  }
  if (party) {
    p1 = p1.replace("AHMED ALI", () => inRun(party));
    pdf1 += pdfOnly(346, 648, party);
  }
  if (from) {
    p1 = p1.replace('MADINA <span class="_ _0"></span>HOTEL', () => inRun(from));
    pdf1 += pdfOnly(336, 555, from);
  }
  if (to) {
    p1 = p1.replace("MADINA AIRPORT", () => inRun(to));
    pdf1 += pdfOnly(338, 524, to);
  }
  p1 = p1.replace(/(<div class="pc[^"]*">)/, (m) => m + pdf1);

  // ---- page 2: driver row, route, date, trip number ----
  p2 = replaceTDivs(p2, [
    (s) => (hasDriver && s === "057 498 6173" ? centered(val(String(drv.phone || ""), 12)) : null),
    (s) => (hasDriver && s === "2592370056" ? centered(val(String(drv.iqama_no || ""), 11)) : null),
    (s) => (hasDriver && s === "SAJJAD ALI" ? centered(val(driverName, 17)) : null),
    (s) => (hasDriver && s === "7887-LXA" ? centered(val(plate, 9)) : null),
    (s) => (hasDriver && s === "HUNDAI STARIA" ? centered(val(up(t.car_model), 11)) : null),
    (s) => (s === "MADINA HOTEL TO MADINA AIRPORT" && (from || to) ? centered(val(`${from} TO ${to}`, 40)) : null),
    (s) => (s === "28-10-2026" && date ? centered(date) : null)
  ]);
  if (t.trip_number) {
    p2 = p2.replace(/(<div class="c x38 y34 [^"]*"><div class="t [^"]*)">[^<]*</,
      (m, a) => a + CENTER + val(String(t.trip_number), 13) + "<");
  }
  const pages = [];
  const chunks = Math.max(1, Math.ceil(pax.length / ROWS.length));
  for (let c = 0; c < chunks; c++) {
    pages.push(fillList(p2, pax.slice(c * ROWS.length, (c + 1) * ROWS.length), c * ROWS.length));
  }

  // ---- page 3: inspection log ----
  if (hasDriver) {
    // the driver name in the declaration grows to the left, away from its label
    const left = 674.43 - Math.max(0, driverName.length * 14 - 111);
    p3 = p3.replace(/(<div class="t m0 x91 [^"]*")>SAJJAD ALI/,
      (m, a) => `${a} style="left:${left.toFixed(1)}px;left:${((left / 893.34) * 100).toFixed(3)}%">` +
        `<span style="${ARIAL}">${esc(driverName)}</span>`);
  }
  p3 = replaceTDivs(p3, [
    (s) => (s === "12:00 AM" && time ? centered(val(time, 14)) : null),
    (s) => (s === "28-10-2026" && date ? centered(date) : null),
    (s) => (hasDriver && s === "7887-LXA" ? centered(val(plate, 10)) : null),
    (s) => (hasDriver && s === "SAJJAD ALI" ? centered(val(driverName, 21)) : null)
  ]);

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