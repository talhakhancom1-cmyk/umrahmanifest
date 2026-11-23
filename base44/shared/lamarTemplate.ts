// Lamar Transport manifest builder — pdf2htmlEX template, 3 pages:
//   pf1 = contract: date, from, to (masked + overlaid)
//   pf2 = manifest: 12 passenger rows (sample text removed, values overlaid)
//   pf3 = inspection log: date + time
// Driver details (عمران خان متزما خان, 2624610669, 9285 ا س ط, 0582704277)
// are BAKED IN; they are only replaced for the drivers in LAMAR_DRIVERS.
import { esc, replaceTDivs } from "./mscTemplate.ts";
import { placeNameAr } from "./placeNamesAr.ts";

export const LAMAR_TEMPLATE_URL =
  "https://base44.app/api/apps/6a5cef68337f5303ffc014f5/files/mp/public/6a5cef68337f5303ffc014f5/22091a2fb_NEWCO.html";

const W = 892.98, H = 1262.88;
const pct = (v: number, r: number) => (v / r * 100).toFixed(4) + "%";
const FONT = "font-family:Arial,Helvetica,sans-serif;color:#000;line-height:1;white-space:nowrap";
const SAMPLES = ["MD GOLAM", "MOBARAK", "ABUL BADSHA", "MD JUNAYED", "MD SHAFIKUL", "RAKIB HASAN",
  "MD MOZAMMEL", "MD MOFAJIOL", "MAOHMED ASAD", "MD SHAHIN", "YASEN MIA", "RUBEL MIA", "BGD", "SA 5021"];

// Extra Lamar drivers (keyed by iqama). When one is picked for the trip, the
// baked driver row is cleared and replaced with these details.
const LAMAR_DRIVERS: Record<string, { name: string; plate: string }> = {
  "2311052233": { name: "محمد اعجاز انور محمد انور", plate: "7452 ا س ا" }
};
// empties the text of the template cells matching the given container classes
function clearCells(page: string, classes: string): string {
  return page.replace(new RegExp('(<div class="c ' + classes + ' [^"]*"><div class="t [^"]*">)[\\s\\S]*?(</div>)', "g"), "$1$2");
}

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

  // ---- Other Lamar driver: replace the baked driver row (pages 2 + 3) ----
  const drv = (t.drivers || [])[0] || {};
  const own = LAMAR_DRIVERS[String(drv.iqama_no || "").trim()];
  if (own) {
    const rtl = (s: string) => `<span style="${b}" dir="rtl">${esc(s)}</span>`;
    const ltr = (s: string) => `<span style="${b}" dir="ltr">${esc(s)}</span>`;
    p2 = inject(clearCells(p2, "\\w+ y28"),
      cell(628, 209, 289, 27, `<span style="${b}" dir="rtl">${fit(esc(own.name), 22)}</span>`, 20) +
      cell(438, 186, 289, 27, ltr(String(drv.iqama_no).trim()), 22) +
      cell(242, 193, 289, 27, rtl(own.plate), 22) +
      cell(56, 182, 289, 27, ltr(String(drv.phone || "").trim()), 20));
    p3 = inject(clearCells(p3, "(?:x40|x42) y50"),
      cell(608, 228, 262, 22, rtl(own.name), 18) +
      cell(406, 198, 262, 22, rtl(own.plate), 17));
    // the baked QR opens the old driver's papers: cover it with one for this trip's
    // own manifest (the web view, since the direct PDF cannot draw the Arabic driver row)
    if (t.id) {
      const pdf = encodeURIComponent(`https://kasafpdf.base44.app/functions/manifestView?trip_id=${t.id}`);
      p2 = inject(p2, `<img class="b44-qr" alt="" src="https://api.qrserver.com/v1/create-qr-code/?size=400x400&margin=8&data=${pdf}&f=.png" ` +
        `style="position:absolute;left:386px;bottom:52.4px;width:122px;height:122px;background:#fff;z-index:9">`);
    }
  }

  const css = `
<style>
#sidebar{display:none!important}
#page-container{left:0!important}
.loading-indicator{display:none!important}
@media screen{.pc{display:block!important;opacity:1!important}}
.b44-qr{left:43.226%!important;bottom:4.157%!important;width:13.662%!important;height:9.66%!important}
@media print{@page{size:A4;margin:0}html,body{margin:0}.pf{page-break-after:always}}
</style>`;
  head = head.replace("</head>", css + "\n</head>").replace("<title></title>", `<title>${esc(t.trip_name || "Trip Manifest")}</title>`);
  return head + p1 + p2 + p3;
}