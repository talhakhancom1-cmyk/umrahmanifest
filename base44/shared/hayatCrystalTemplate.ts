// Hayat Crystal manifest builder (pdf2htmlEX template, 3 pages):
//   pf1 = Arabic contract (left as-is, glyph-encoded)
//   pf2 = manifest: vehicle/driver row, date, 11 passenger rows, footer date/location
//   pf3 = daily vehicle inspection log (time, date, plate, driver)
// Every value on pf2 sits in its own table-cell container, so we replace the
// text div inside the container with a centred value (screen + print safe).
import { esc, replaceTDivs } from "./mscTemplate.ts";

export const HAYAT_CRYSTAL_TEMPLATE_URL =
  "https://media.base44.com/files/public/6a5cef68337f5303ffc014f5/1d3bcf785_HAYATCRYSTAL.html";

// Passenger row containers (y-class) and column containers (x-class)
const ROWS = ["y62", "y63", "y64", "y65", "y69", "y6b", "y6d", "y6f", "y70", "y72", "y73"];
const COL = { nat: "x116", id: "x10b", name: "x15" };
const PAX_FONT = "h1e ff3 fsd fc0 sc0 ls0 ws0";

function fmtDash(d: string): string {
  if (!d) return "";
  const dt = new Date(d + "T00:00:00");
  if (isNaN(dt.getTime())) return String(d);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(dt.getDate())}-${p(dt.getMonth() + 1)}-${dt.getFullYear()}`;
}

function squeeze(s: string, fits: number): string {
  if (s.length <= fits) return s;
  return `<span style="display:inline-block;white-space:nowrap;transform:scaleX(${(fits / s.length).toFixed(3)});transform-origin:center center">${s}</span>`;
}

// Replace the text div inside container "c <cx> <cy>" with a centred value.
// font: optional replacement classes (keeps the original y-class).
function fillCell(html: string, cx: string, cy: string, value: string, font = ""): string {
  const re = new RegExp(`(<div class="c ${cx} ${cy} [^"]*">)<div class="t ([^"]*)">[\\s\\S]*?</div>`);
  return html.replace(re, (_m, open, cls) => {
    const y = (cls.match(/\by[0-9a-f]+\b/) || [""])[0];
    const c = font ? `t m0 ${y} ${font}` : cls.replace(/\bx[0-9a-f]+\b/, "");
    return `${open}<div class="${c}" style="left:0;width:100%;text-align:center">${value}</div>`;
  });
}

export function buildFromHayatCrystalTemplate(templateHtml: string, trip: any): string {
  const t = trip || {};
  const passengers = t.passengers || [];
  const d1 = (t.drivers || [])[0] || {};
  const date = fmtDash(t.travel_date);
  const time = esc(t.trip_time || "");
  const from = esc(String(t.route_from || "").replace(/_/g, " ").toUpperCase());
  const to = esc(String(t.route_to || "").replace(/_/g, " ").toUpperCase());
  const plate = esc(String(t.vehicle_plate || "").toUpperCase());
  const driver = esc(String(d1.name || "").trim().toUpperCase());

  const parts = templateHtml.split(/(<div id="pf[123]")/);
  let head = parts[0];
  const p1 = (parts[1] || "") + (parts[2] || "");
  let p2 = (parts[3] || "") + (parts[4] || "");
  let p3 = (parts[5] || "") + (parts[6] || "");

  // ---- Page 2: vehicle / driver row ----
  if (plate) p2 = fillCell(p2, "x103", "y50", squeeze(plate, 11));
  if (t.car_model) p2 = fillCell(p2, "x10b", "y50", squeeze(esc(t.car_model.toUpperCase()), 12));
  p2 = fillCell(p2, "x37", "y50", esc(d1.phone || ""));
  if (d1.iqama_no) p2 = fillCell(p2, "xa5", "y50", esc(d1.iqama_no));
  if (driver) p2 = fillCell(p2, "x80", "y50", squeeze(driver, 18));
  if (date) {
    p2 = fillCell(p2, "x116", "y54", `<span dir="ltr">${date}</span>`);
    p2 = fillCell(p2, "x116", "y76", `<span dir="ltr">${date}${time ? " " + time : ""}</span>`);
  }
  if (from || to) p2 = fillCell(p2, "x116", "y7a", `${from} TO ${to}`);

  // ---- Page 2: passenger rows (all 11 rewritten so samples are cleared) ----
  ROWS.forEach((y, i) => {
    const p = passengers[i] || {};
    p2 = fillCell(p2, COL.nat, y, esc(p.nationality || ""), PAX_FONT);
    p2 = fillCell(p2, COL.id, y, esc(p.id_number || ""), PAX_FONT);
    p2 = fillCell(p2, COL.name, y, squeeze(esc(String(p.name || "").toUpperCase()), 30), PAX_FONT);
  });

  // ---- Page 3: inspection header + signature ----
  p3 = replaceTDivs(p3, [
    (s) => s === "06:00" ? time : null,
    (s) => s === "22/10/2026" && date ? date.split("-").join("/") : null,
    (s) => s === "8548 USA" && plate ? plate : null,
    (s) => s === "MUHAMMAD USMAN" && driver ? driver : null
  ]);

  const extraCss = `
<style>
#sidebar{display:none!important}
#page-container{left:0!important}
.loading-indicator{display:none!important}
@media screen{.pc{display:block!important;opacity:1!important}}
@media print{@page{size:A4;margin:0}html,body{margin:0}.pf{page-break-after:always}}
</style>`;
  head = head.replace("</head>", extraCss + "\n</head>");
  head = head.replace("<title></title>", `<title>${esc(t.trip_name || "Trip Manifest")}</title>`);
  return head + p1 + p2 + p3;
}