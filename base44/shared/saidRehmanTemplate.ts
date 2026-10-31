// Q Taxi (Said Rehman) manifest builder — pdf2htmlEX template, 3 pages:
//   pf1 = contract: date, second party, route from/to
//   pf2 = trip details + passenger list (12 rows)
//   pf3 = vehicle inspection: time, date
// Driver details (SAID REHMAN, iqama 2436274993, phone 580434029,
// plate 8874 D S A, car H 1) are BAKED IN and never overridden.
import { esc, replaceTDivs } from "./mscTemplate.ts";

export const SAID_REHMAN_TEMPLATE_URL =
  "https://media.base44.com/files/public/6a5cef68337f5303ffc014f5/4bc723803_SAIDREHMAN.html";

const PAGE_W = 918;
const PAGE_H = 1188;
const pct = (v: number, ref: number) => (v / ref * 100).toFixed(4) + "%";

// Passenger columns (page px) and row text bottoms (page px)
const COL_NAT = { left: 96, width: 180 };
const COL_ID = { left: 276, width: 214 };
const COL_NAME = { left: 490, width: 285 };
const ROW_BOTTOMS = [444.78, 416.52, 385.74, 357.3, 329.04, 298.26, 269.82, 241.38, 212.94, 184.5, 156.06, 127.62];

function fit(s: string, chars: number): string {
  if (s.length <= chars) return s;
  return `<span style="display:inline-block;white-space:nowrap;transform:scaleX(${(chars / s.length).toFixed(3)});transform-origin:center center">${s}</span>`;
}

function cell(left: number, width: number, bottom: number, html: string, size = 20, align = "center"): string {
  return `<div style="position:absolute;left:${pct(left, PAGE_W)};bottom:${pct(bottom, PAGE_H)};width:${pct(width, PAGE_W)};` +
    `text-align:${align};white-space:nowrap;font-family:Arial,Helvetica,sans-serif;font-size:${size}px;line-height:1;color:#000;z-index:9">${html}</div>`;
}

function inject(page: string, cells: string): string {
  if (!cells) return page;
  const grid = `<div style="position:absolute;left:0;top:0;width:100%;height:100%;z-index:9">${cells}</div>`;
  return page.replace(/(<div class="pc[^"]*">)/, `$1${grid}`);
}

function dateParts(d: string) {
  const dt = new Date((d || "") + "T00:00:00");
  if (!d || isNaN(dt.getTime())) return null;
  const p = (n: number) => String(n).padStart(2, "0");
  return { dd: p(dt.getDate()), mm: p(dt.getMonth() + 1), yyyy: String(dt.getFullYear()) };
}

const place = (s: string) => esc(String(s || "").replace(/_/g, " ").trim().toUpperCase());

export function buildFromSaidRehmanTemplate(templateHtml: string, trip: any): string {
  const t = trip || {};
  const passengers = t.passengers || [];
  const dp = dateParts(t.travel_date);
  const time = esc(t.trip_time || "");
  const from = place(t.route_from);
  const to = place(t.route_to);

  const leader = String((passengers[0] || {}).name || "").trim().toUpperCase();
  const members = Math.max(passengers.length - 1, 0);
  const secondParty = leader ? esc(`${leader}  WITH ${String(members).padStart(2, "0")} MEMBERS`) : "";

  const parts = templateHtml.split(/(<div id="pf[123]")/);
  let head = parts[0];
  let p1 = (parts[1] || "") + (parts[2] || "");
  let p2 = (parts[3] || "") + (parts[4] || "");
  let p3 = (parts[5] || "") + (parts[6] || "");

  // ---- Page 1: date in place; second party + route as overlays ----
  p1 = replaceTDivs(p1, [
    (s) => s === "26/10/2026" ? (dp ? `${dp.dd}/${dp.mm}/${dp.yyyy}` : "") : null,
    (s) => s.startsWith("JAVED AKHTAR") ? "" : null,
    (s) => s === "TAIF MAKKAH" ? "" : null
  ]);
  p1 = inject(p1,
    cell(100, 615, 560.16, fit(secondParty, 48), 20, "right") +
    cell(506, 359, 342.9, fit(from, 28)) +
    cell(86, 353, 342.9, fit(to, 28))
  );

  // ---- Page 2: trip row (date / from / to / time) + passengers ----
  p2 = replaceTDivs(p2, [
    (s) => s === "MAKKAH &apos;" ? "" : null,
    (s) => /^8:20 TAIF/.test(s) ? "" : null,
    (s) => s.startsWith("PAKISTAN ") ? "" : null
  ]);
  let cells2 =
    cell(737, 119, 637.74, dp ? `<span dir="ltr">${dp.dd}/${dp.mm}/${dp.yyyy.slice(-2)}</span>` : "", 19) +
    cell(595, 142, 637.74, fit(from, 13), 19) +
    cell(436, 159, 637.74, fit(to, 14), 19) +
    cell(276, 160, 637.74, `<span dir="ltr">${fit(time, 14)}</span>`, 19);
  passengers.slice(0, ROW_BOTTOMS.length).forEach((p: any, i: number) => {
    const b = ROW_BOTTOMS[i];
    cells2 += cell(COL_NAT.left, COL_NAT.width, b, fit(esc(String(p.nationality || "").toUpperCase()), 15));
    cells2 += cell(COL_ID.left, COL_ID.width, b, fit(esc(p.id_number || ""), 18));
    cells2 += cell(COL_NAME.left, COL_NAME.width, b, fit(esc(String(p.name || "").toUpperCase()), 20));
  });
  p2 = inject(p2, cells2);

  // ---- Page 3: inspection time + date ----
  p3 = replaceTDivs(p3, [
    (s) => s === "8:20" ? time : null,
    (s) => s === "10/26/2026" ? (dp ? `${dp.mm}/${dp.dd}/${dp.yyyy}` : "") : null
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