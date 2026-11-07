// Tail Saeed Ibrahim Al-Thubaiti — vehicle 6677-LSA (pdf2htmlEX, 2 pages):
//   pf1 = contract: date, second party, from, to (swapped in the text layer)
//   pf2 = manifest: route, date, time + 12 passenger rows (overlaid)
// Driver details (MUHAMMAD NAWAZ, iqama 22558838831, phone 0534014146,
// plate 6677-LSA, TOYOTA HIACE) are BAKED IN and never overridden.
import { esc, fmtDate, replaceTDivs, centered } from "./mscTemplate.ts";

export const TAIL_SAEED_22_TEMPLATE_URL =
  "https://base44.app/api/apps/6a5cef68337f5303ffc014f5/files/mp/public/6a5cef68337f5303ffc014f5/f59b9b616_TAILSAEED22.html";

const W = 893.16, H = 1262.88;
const pct = (v: number, r: number) => (v / r * 100).toFixed(4) + "%";
const COLS = { nat: [54.04, 205.64], id: [261.1, 212.84], name: [474.66, 311.19] };
// [bottom, height] of the 12 passenger rows, from the template's own cells
const ROWS = [[746.13, 47.16], [695.73, 49.68], [644.94, 50.08], [594.54, 49.68], [546.3, 47.52],
  [495.87, 49.72], [445.11, 50.04], [394.67, 49.72], [346.43, 47.52], [296.03, 49.68],
  [245.6, 49.72], [194.84, 50.04]];
const SAMPLE_PAX = ["PAKISTAN", "JP0162112", "NIAZ", "NX2742022", "JAMSHED", "DP1079833", "SAFIA",
  "HL5149623", "NUZHAT", "FC5208481", "ZAMAN", "EF7967732", "TARIQ", "GN9158783", "FIDA",
  "CC5197633", "SHAHID", "HW1810062", "ASIF"];

function fit(s: string, chars: number): string {
  if (s.length <= chars) return s;
  return `<span style="display:inline-block;white-space:nowrap;transform:scaleX(${(chars / s.length).toFixed(3)});transform-origin:center center">${s}</span>`;
}
function cell(col: number[], row: number[], html: string): string {
  return `<div style="position:absolute;left:${pct(col[0], W)};bottom:${pct(row[0], H)};width:${pct(col[1], W)};height:${pct(row[1], H)};display:flex;align-items:center;justify-content:center;font-family:Arial,Helvetica,sans-serif;font-size:20px;color:#000;white-space:nowrap;z-index:9">${html}</div>`;
}

export function buildFromTailSaeed22Template(templateHtml: string, trip: any): string {
  const t = trip || {};
  const pax = t.passengers || [];
  const date = esc(fmtDate(t.travel_date));
  const time = esc(t.trip_time || "");
  const place = (s: string) => esc(String(s || "").replace(/_/g, " ").trim().toUpperCase());
  const from = place(t.route_from), to = place(t.route_to);
  const leader = String((pax[0] || {}).name || "").trim().toUpperCase();
  const n = Math.max(pax.length - 1, 0);
  const second = leader ? esc(`${leader} / WITH ${String(n).padStart(2, "0")} MEMBER${n === 1 ? "" : "S"}`) : "";

  const parts = templateHtml.split(/(<div id="pf[12]")/);
  let head = parts[0];
  let p1 = (parts[1] || "") + (parts[2] || "");
  let p2 = (parts[3] || "") + (parts[4] || "");

  // ---- Page 1 ----
  // Embedded template fonts are subsets, so new values use Arial
  const a = (s: string) => s ? `<span style="font-family:Arial,Helvetica,sans-serif;font-weight:700">${s}</span>` : "";
  if (date) p1 = p1.replace('<span class="ls9">18<span class="ls1">-May-</span>26</span>', a(date));
  p1 = replaceTDivs(p1, [
    (s) => s === "NIAZ" ? centered(a(fit(second, 30))) : null,
    (s) => s === "MADINAH" ? centered(a(from)) : null,
    (s) => s === "MAKKAH" ? centered(a(to)) : null,
  ]);

  // ---- Page 2: header values, then clear sample passengers ----
  p2 = replaceTDivs(p2, [
    (s) => s === "MADINAH TO MAKKAH" ? centered(a(from && to ? `${from} TO ${to}` : "")) : null,
    (s) => s === "18-May-26" ? centered(a(date)) : null,
    (s) => s === "10:06 PM" ? centered(a(time)) : null,
    (s) => SAMPLE_PAX.includes(s) ? "" : null,
  ]);
  let cells = "";
  pax.slice(0, ROWS.length).forEach((p: any, i: number) => {
    cells += cell(COLS.nat, ROWS[i], fit(esc(String(p.nationality || "").toUpperCase()), 14));
    cells += cell(COLS.id, ROWS[i], fit(esc(p.id_number || ""), 15));
    cells += cell(COLS.name, ROWS[i], fit(esc(String(p.name || "").toUpperCase()), 24));
  });
  if (cells) {
    const grid = `<div style="position:absolute;left:0;top:0;width:100%;height:100%;z-index:9">${cells}</div>`;
    p2 = p2.replace(/(<div class="pc[^"]*">)/, `$1${grid}`);
  }

  const css = `
<style>
#sidebar{display:none!important}
#page-container{left:0!important}
.loading-indicator{display:none!important}
.t{overflow:visible!important}
@media screen{.pc{display:block!important;opacity:1!important}}
@media print{@page{size:A4;margin:0}html,body{margin:0}.pf{page-break-after:always}}
</style>`;
  head = head.replace("</head>", css + "\n</head>").replace("<title></title>", `<title>${esc(t.trip_name || "Trip Manifest")}</title>`);
  return head + p1 + p2;
}