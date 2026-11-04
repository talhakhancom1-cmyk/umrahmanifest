// Lamar Transport manifest builder — pdf2htmlEX template, 3 pages:
//   pf1 = contract: date, from, to (masked + overlaid)
//   pf2 = manifest: 12 passenger rows (sample text removed, values overlaid)
//   pf3 = inspection log: date + time
// Driver details (عمران خان متزما خان, 2624610669, 9285 ا س ط, 0582704277)
// are BAKED IN and never overridden.
import { esc, replaceTDivs } from "./mscTemplate.ts";
import { placeNameAr } from "./placeNamesAr.ts";

export const LAMAR_TEMPLATE_URL =
  "https://base44.app/api/apps/6a5cef68337f5303ffc014f5/files/mp/public/6a5cef68337f5303ffc014f5/22091a2fb_NEWCO.html";

const W = 892.98, H = 1262.88;
const pct = (v: number, r: number) => (v / r * 100).toFixed(4) + "%";
const FONT = "font-family:Arial,Helvetica,sans-serif;color:#000;line-height:1;white-space:nowrap";
const SAMPLES = ["MD GOLAM", "MOBARAK", "ABUL BADSHA", "MD JUNAYED", "MD SHAFIKUL", "RAKIB HASAN",
  "MD MOZAMMEL", "MD MOFAJIOL", "MAOHMED ASAD", "MD SHAHIN", "YASEN MIA", "RUBEL MIA", "BGD", "SA 5021"];

function fit(s: string, chars: number): string {
  if (s.length <= chars) return s;
  return `<span style="display:inline-block;transform:scaleX(${(chars / s.length).toFixed(3)});transform-origin:center center">${s}</span>`;
}
// top = top edge of the cell, h = cell height; text is vertically centred
function cell(left: number, width: number, top: number, h: number, html: string, size = 18, bg = false): string {
  if (!html && !bg) return "";
  return `<div style="position:absolute;left:${pct(left, W)};top:${pct(top, H)};width:${pct(width, W)};height:${pct(h, H)};display:flex;align-items:center;justify-content:center;font-size:${size}px;${FONT};${bg ? "background:#fff;" : ""}z-index:9">${html}</div>`;
}
function inject(page: string, html: string): string {
  const grid = `<div style="position:absolute;left:0;top:0;width:100%;height:100%;z-index:9">${html}</div>`;
  return page.replace(/(<div class="pc[^"]*">)/, `$1${grid}`);
}

export function buildFromLamarTemplate(templateHtml: string, trip: any): string {
  const t = trip || {};
  const pax = t.passengers || [];
  const dt = new Date((t.travel_date || "") + "T00:00:00");
  const pd = (n: number) => String(n).padStart(2, "0");
  const date = isNaN(dt.getTime()) ? "" : `${pd(dt.getDate())}/${pd(dt.getMonth() + 1)}/${dt.getFullYear()}`;
  const time = esc(t.trip_time || "");
  const ar = (s: string) => esc(placeNameAr(String(s || "").replace(/_/g, " ").trim()));
  const dl = (s: string) => s ? `<span dir="ltr">${s}</span>` : "";
  const flight = esc(String(t.trip_number || "").toUpperCase());

  const parts = templateHtml.split(/(<div id="pf[123]")/);
  let head = parts[0];
  let p1 = (parts[1] || "") + (parts[2] || "");
  let p2 = (parts[3] || "") + (parts[4] || "");
  let p3 = (parts[5] || "") + (parts[6] || "");

  // ---- Page 1: date, from, to ----
  const b = "font-weight:700";
  p1 = inject(p1,
    cell(630, 150, 212, 28, dl(date), 18, true) +
    cell(628, 122, 734, 28, `<span style="${b}" dir="rtl">${ar(t.route_from)}</span>`, 20, true) +
    cell(587, 138, 779, 28, `<span style="${b}" dir="rtl">${ar(t.route_to)}</span>`, 20, true));

  // ---- Page 2: remove sample passengers, overlay real ones ----
  p2 = replaceTDivs(p2, [(s) => SAMPLES.includes(s.trim()) ? "" : null]);
  let c2 = "";
  pax.slice(0, 12).forEach((p: any, i: number) => {
    const top = 477 + 41 * i;
    c2 += cell(384, 437, top, 40, fit(esc(String(p.name || "").toUpperCase()), 30), 22);
    c2 += cell(217, 167, top, 40, fit(esc(String(p.nationality || "").toUpperCase()), 12), 20);
    c2 += cell(28, 189, top, 40, fit(flight || esc(p.id_number || ""), 14), 20);
  });
  p2 = inject(p2, c2);

  // ---- Page 3: date + time ----
  p3 = inject(p3,
    cell(34, 226, 264, 20, dl(time), 16, true) +
    cell(272, 126, 264, 20, dl(date), 16, true));

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