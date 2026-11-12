// Muhammad Shafi Nabi Gul — vehicle EXA-3302 (pdf2htmlEX template, 3 pages):
//   pf1 = manifest: date, from, to, passenger count, time + 16 passenger rows
//   pf2 = contract: date, second party (lead passenger + ID), from, to
//   pf3 = inspection log: time, date
// Driver details (MUHAMMAD SHAFI NABI GUL, iqama 2577872621, PAKISTAN,
// plate EXA-3302, TOYOTA MICRO BUS) are BAKED IN and never overridden.
import { esc } from "./mscTemplate.ts";

export const SHAFI_TEMPLATE_URL =
  "https://base44.app/api/apps/6a5cef68337f5303ffc014f5/files/mp/public/6a5cef68337f5303ffc014f5/a44faaaa9_JAMALKHAN3297.html";

const W = 918, H = 1188;
const pct = (v: number, r: number) => (v / r * 100).toFixed(4) + "%";
const ARIAL = "font-family:Arial,Helvetica,sans-serif;font-weight:700";
const DRIVER = "MUHAMMAD SHAFI NABI GUL";
const DRIVER_AR = "محمد شافي جول نبي";
// "جمال خان" as stored in the template's glyph-encoded text layer (page 3)
const SAMPLE_DRIVER_AR = "\u{F0428}\u{F0213}\u{F0282}\uE603\u{F03FC}\u{F0213}\u{F0420}\u{F0280}";
// The text layer is scaled 0.375, so a cell's full width is 266.667%
const CENTER = "left:0;width:266.667%;text-align:center";

// Passenger table (page px): [left, width] per column, 16 rows
const COLS = { nat: [31.7, 130], id: [162.4, 130], name: [292.4, 519.9] };
const ROW_H = 24.84;
const ROWS = Array.from({ length: 16 }, (_, i) => 634.2 - ROW_H * i);
const SAMPLE_PAX = ["DUTCH", "MN82HDF37", "NPL1PFC37", "NS6RLK359", "NWJ6D44R0", "NS1H4J1C9",
  "ZAKARIA", "AHMED", "HAMIDA", "MOUNIA", "TARIK"];

function fit(s: string, chars: number): string {
  if (s.length <= chars) return s;
  return `<span style="display:inline-block;white-space:nowrap;transform:scaleX(${(chars / s.length).toFixed(3)});transform-origin:center center">${s}</span>`;
}
// Embedded template fonts are subsets, so new values use Arial
const a = (s: string) => s ? `<span style="${ARIAL}">${s}</span>` : "";
const dl = (s: string) => s ? `<span dir="ltr">${s}</span>` : "";

// Rewrites a table cell's sample text, centered inside its cell.
function swap(page: string, sample: string, html: string, style = CENTER): string {
  const re = new RegExp(`(<div class="c [^"]+"><div class="t [^"]+)">${sample.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}</div>`, "g");
  return page.replace(re, (_m, open) => `${open}" style="${style}">${html}</div>`);
}
// Right-aligned value in the 714.9px contract cells. "--pdf-left" is ignored by
// browsers; the PDF builder reads it as the text's left edge.
function rightStyle(text: string): string {
  const left = Math.max(0, 714.9 - 9 - text.length * 17.6 * 0.66);
  return `--pdf-left:${left.toFixed(1)}px;left:0;width:266.667%;box-sizing:border-box;padding-right:24px;text-align:right`;
}
function cell(col: number[], bottom: number, html: string): string {
  return `<div class="b44-cell" style="position:absolute;left:${pct(col[0], W)};bottom:${pct(bottom + 3.7, H)};width:${pct(col[1], W)};text-align:center;white-space:nowrap;${ARIAL};font-size:17px;line-height:1;color:#000;z-index:9">${html}</div>`;
}

export function buildFromShafiTemplate(templateHtml: string, trip: any): string {
  const t = trip || {};
  const pax = t.passengers || [];
  const dt = new Date((t.travel_date || "") + "T00:00:00");
  const pd = (n: number) => String(n).padStart(2, "0");
  const date = isNaN(dt.getTime()) ? "" : `${pd(dt.getDate())}/${pd(dt.getMonth() + 1)}/${dt.getFullYear()}`;
  const time = esc(t.trip_time || "");
  const place = (s: string) => esc(String(s || "").replace(/_/g, " ").trim().toUpperCase());
  const from = place(t.route_from), to = place(t.route_to);
  const leader = esc(String((pax[0] || {}).name || "").trim().toUpperCase());
  const leaderId = esc((pax[0] || {}).id_number || "");

  const parts = templateHtml.split(/(<div id="pf[123]")/);
  let head = parts[0];
  let p1 = (parts[1] || "") + (parts[2] || "");
  let p2 = (parts[3] || "") + (parts[4] || "");
  let p3 = (parts[5] || "") + (parts[6] || "");

  // ---- Page 1: driver row (fixed), trip details, passengers ----
  p1 = p1.replace(/<div class="t ([^"]+)">JAMAL KHAN<\/div>/, (_m, cls) =>
    `<div class="t ${cls.replace(/\bfs\w+/, "fsb44")}" style="${CENTER}">${a(DRIVER)}</div>`);
  p1 = swap(p1, "563865510", "");
  p1 = p1.split("2602072775").join("2577872621").split("EXA-3297").join("EXA-3302");
  p1 = swap(p1, "03/11/2026", a(dl(date)));
  p1 = swap(p1, "MAKKAH", a(fit(from, 20)));
  p1 = swap(p1, "MADINA", a(fit(to, 26)));
  p1 = swap(p1, "5", a(pax.length ? String(pax.length) : ""));
  p1 = swap(p1, "14:00", a(dl(time)));
  SAMPLE_PAX.forEach((s) => { p1 = swap(p1, s, ""); });
  let cells = "";
  pax.slice(0, ROWS.length).forEach((p: any, i: number) => {
    cells += cell(COLS.nat, ROWS[i], fit(esc(String(p.nationality || "").toUpperCase()), 10));
    cells += cell(COLS.id, ROWS[i], fit(esc(p.id_number || ""), 10));
    cells += cell(COLS.name, ROWS[i], fit(esc(String(p.name || "").toUpperCase()), 40));
  });
  if (cells) {
    const grid = `<div style="position:absolute;left:0;top:0;width:100%;height:100%;z-index:9">${cells}</div>`;
    p1 = p1.replace(/(<div class="pc[^"]*">)/, `$1${grid}`);
  }

  // ---- Page 2: contract ----
  p2 = swap(p2, "03/11/2026", a(dl(date)));
  p2 = swap(p2, "ZAKARIA", a(fit(leader, 26)));
  p2 = swap(p2, "MN82HDF37", a(fit(leaderId, 14)));
  p2 = swap(p2, "MAKKAH", a(from), rightStyle(from));
  p2 = swap(p2, "MADINA", a(to), rightStyle(to));

  // ---- Page 3: inspection log (fixed driver name, Latin + Arabic) ----
  const driverAr = `<span style="display:inline-block;position:relative;width:147px;height:1em">` +
    `<span dir="rtl" style="position:absolute;right:0;bottom:-0.25em;white-space:nowrap;font-family:Arial,Tahoma,sans-serif;font-weight:700">${DRIVER_AR}</span></span>`;
  p3 = swap(p3, "JAMAL KHAN", a(DRIVER));
  p3 = p3.split("JAMAL KHAN").join(a(DRIVER)).split(SAMPLE_DRIVER_AR).join(driverAr).split("EXA-3297").join("EXA-3302");
  p3 = swap(p3, "03/11/2026", a(dl(date)));
  p3 = swap(p3, "14:00", a(dl(time)));

  const css = `
<style>
#sidebar{display:none!important}
#page-container{left:0!important}
.loading-indicator{display:none!important}
.t{overflow:visible!important}
.fsb44{font-size:32px}
@media screen{.pc{display:block!important;opacity:1!important}}
@media print{@page{size:A4;margin:0}html,body{margin:0}.pf{page-break-after:always}.fsb44{font-size:28.44pt}}
</style>`;
  head = head.replace("</head>", css + "\n</head>").replace("<title></title>", `<title>${esc(t.trip_name || "Trip Manifest")}</title>`);
  return head + p1 + p2 + p3;
}