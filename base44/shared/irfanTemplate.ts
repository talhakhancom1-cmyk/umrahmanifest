// Modern Business (Irfan) manifest builder — pdf2htmlEX template, 3 pages:
//   pf1 = contract (image): date, second party, from, to as overlays
//   pf2 = manifest: date/time/destination + 15 passenger rows
//   pf3 = inspection log: time + date
// Driver details (محمد عرفان خان مزمل خان, 0592623344, iqama 2334425036,
// plate 4443 U R A, HIACE) are BAKED IN and never overridden.
import { esc, replaceTDivs } from "./mscTemplate.ts";

export const IRFAN_TEMPLATE_URL =
  "https://base44.app/api/apps/6a5cef68337f5303ffc014f5/files/mp/public/6a5cef68337f5303ffc014f5/8607d5ac2_IRFAN.html";

const W = 918, H = 1188;
const pct = (v: number, r: number) => (v / r * 100).toFixed(4) + "%";
const FONT = "font-family:Arial,Helvetica,sans-serif;color:#000;line-height:1;white-space:nowrap";

function fit(s: string, chars: number): string {
  if (s.length <= chars) return s;
  return `<span style="display:inline-block;transform:scaleX(${(chars / s.length).toFixed(3)});transform-origin:center center">${s}</span>`;
}
function cell(left: number, width: number, bottom: number, html: string, size = 18, align = "center"): string {
  if (!html) return "";
  return `<div style="position:absolute;left:${pct(left, W)};bottom:${pct(bottom, H)};width:${pct(width, W)};text-align:${align};font-size:${size}px;${FONT};z-index:9">${html}</div>`;
}
function mask(left: number, width: number, bottom: number, height: number): string {
  return `<div style="position:absolute;left:${pct(left, W)};bottom:${pct(bottom, H)};width:${pct(width, W)};height:${pct(height, H)};background:#fff;z-index:8"></div>`;
}
function inject(page: string, html: string): string {
  const grid = `<div style="position:absolute;left:0;top:0;width:100%;height:100%;z-index:9">${html}</div>`;
  return page.replace(/(<div class="pc[^"]*">)/, `$1${grid}`);
}

const NAT = { l: 646, w: 267 }, ID = { l: 365, w: 281 }, NAME = { l: 74, w: 291 };
const ROWS = Array.from({ length: 15 }, (_, i) => 709.02 - 29.7 * i);

export function buildFromIrfanTemplate(templateHtml: string, trip: any): string {
  const t = trip || {};
  const pax = t.passengers || [];
  const dt = new Date((t.travel_date || "") + "T00:00:00");
  const pd = (n: number) => String(n).padStart(2, "0");
  const date = isNaN(dt.getTime()) ? "" : `${pd(dt.getDate())}/${pd(dt.getMonth() + 1)}/${dt.getFullYear()}`;
  const time = esc(t.trip_time || "");
  const place = (s: string) => esc(String(s || "").replace(/_/g, " ").trim().toUpperCase());
  const from = place(t.route_from), to = place(t.route_to);
  const leader = String((pax[0] || {}).name || "").trim().toUpperCase();
  const n = Math.max(pax.length - 1, 0);
  const second = leader ? esc(`${leader} WITH ${pd(n)} MEMBERS`) : "";
  const dl = (s: string) => s ? `<span dir="ltr">${s}</span>` : "";

  const parts = templateHtml.split(/(<div id="pf[123]")/);
  let head = parts[0];
  let p1 = (parts[1] || "") + (parts[2] || "");
  let p2 = (parts[3] || "") + (parts[4] || "");
  let p3 = (parts[5] || "") + (parts[6] || "");

  // ---- Page 1 ----
  p1 = inject(p1,
    (date ? mask(619, 117, 903, 28) : "") +
    cell(619, 117, 909, dl(date), 20) +
    cell(40, 619, 646, fit(second, 50), 20, "right") +
    cell(40, 619, 501, fit(from, 50), 20, "right") +
    cell(40, 619, 441, fit(to, 50), 20, "right"));

  // ---- Page 2 ----
  p2 = replaceTDivs(p2, [(s) => s.startsWith("01/11/2026") ? "" : null]);
  let c2 = cell(5, 212, 792.18, dl(date)) + cell(217, 148, 792.18, dl(time)) +
    cell(488, 425, 792.18, fit(from && to ? `${from} TO ${to}` : "", 36));
  pax.slice(0, ROWS.length).forEach((p: any, i: number) => {
    c2 += cell(NAME.l, NAME.w, ROWS[i], fit(esc(String(p.name || "").toUpperCase()), 24), 16);
    c2 += cell(ID.l, ID.w, ROWS[i], fit(esc(p.id_number || ""), 24), 16);
    c2 += cell(NAT.l, NAT.w, ROWS[i], fit(esc(String(p.nationality || "").toUpperCase()), 22), 16);
  });
  p2 = inject(p2, c2);

  // ---- Page 3: mask sample time/date cells, overlay new values ----
  p3 = inject(p3,
    mask(42, 126, 845, 24) + mask(185, 194, 845, 24) +
    cell(37, 136, 849, dl(time)) + cell(179, 206, 849, dl(date)));

  const css = `
<style>
#sidebar{display:none!important}
#page-container{left:0!important}
.loading-indicator{display:none!important}
@media screen{.pc{display:block!important;opacity:1!important}}
@media print{@page{size:A4;margin:0}html,body{margin:0}.pf{page-break-after:always}}
</style>`;
  head = head.replace("</head>", css + "\n</head>").replace("<title></title>", `<title>${esc(t.trip_name || "Trip Manifest")}</title>`);
  return head + p1 + p2 + p3;
}