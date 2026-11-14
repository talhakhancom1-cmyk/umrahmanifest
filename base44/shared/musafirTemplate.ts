// Almusafir Almuatamad (المسافر المعتمد) — contract template, pdf2htmlEX layout.
// All visible text lives in the template's own text layer, so each device value
// is swapped by dropping the sample run and drawing our value in its place.
// Driver details fall back to the baked-in ones when the trip has no driver.
import { esc } from "./mscTemplate.ts";

export const MUSAFIR_TEMPLATE_URL =
  "https://base44.app/api/apps/6a5cef68337f5303ffc014f5/files/mp/public/6a5cef68337f5303ffc014f5/00fbad5d3_newco_raw.html";

const BAKED_DRIVER = {
  name: "MUHAMMAD SHAFI NABI GUL",
  iqama: "2577872621",
  phone: "",
  plate: "EXA-3302"
};

// sample name glyphs inside the "الطرف الثاني" body run (Mina Gula)
const SAMPLE_NAME_GLYPHS =
  "\ueba1\uec35\uec4b\uebda\ue603\ueb8a\uec8a\uec41\uebda";

function cssVal(html: string, kind: string, name: string) {
  const i = html.indexOf("." + kind + name + "{");
  if (i < 0) return null;
  const e = html.indexOf("}", i);
  const m = /:\s*(-?[\d.]+)px/.exec(html.slice(i, e + 1));
  return m ? parseFloat(m[1]) : null;
}

function classTok(cls: string, kind: string) {
  const m = new RegExp("(?:^|\\s)" + kind + "([\\w-]+)").exec(cls);
  return m ? m[1] : "";
}

// Draws our value in place of a removed sample run.
function overlay(left: number, bottom: number, html: string, size = 18, width = 130) {
  return `<div class="b44-cell" style="position:absolute;left:${left}px;bottom:${bottom}px;width:${width}px;` +
    `text-align:center;font-size:${size}px;line-height:1;white-space:nowrap;` +
    `font-family:Arial,Helvetica,sans-serif;font-weight:700;color:#000;z-index:9">${html}</div>`;
}

function overlayRight(left: number, bottom: number, html: string, size = 17, width = 130) {
  return overlay(left, bottom, html, size, width).replace("text-align:center", "text-align:right");
}

// Removes the sample runs listed in `targets` ("left:bottom" -> replacement html)
function patch(page: string, tpl: string, targets: Record<string, string>) {
  let out = "";
  let i = 0;
  while (true) {
    const p = page.indexOf('<div class="t ', i);
    if (p < 0) { out += page.slice(i); break; }
    out += page.slice(i, p);
    const gt = page.indexOf(">", p);
    const cls = page.slice(p + 14, gt);
    let depth = 1, j = gt + 1;
    while (depth > 0) {
      const a = page.indexOf("<div", j);
      const b = page.indexOf("</div>", j);
      if (b < 0) { j = page.length; break; }
      if (a >= 0 && a < b) { depth++; j = a + 5; } else { depth--; j = b + 6; }
    }
    const l = cssVal(tpl, "x", classTok(cls, "x"));
    const b2 = cssVal(tpl, "y", classTok(cls, "y"));
    const key = l != null && b2 != null ? Math.round(l) + ":" + Math.round(b2) : "";
    if (key && targets[key] != null) {
      if (targets[key]) out += targets[key];
      delete targets[key];
    } else {
      out += page.slice(p, j);
    }
    i = j;
  }
  return out;
}

export function buildFromMusafirTemplate(templateHtml: string, trip: any): string {
  const t = trip || {};
  const pax = t.passengers || [];
  const drv = (t.drivers && t.drivers[0]) || {};
  const dt = new Date((t.travel_date || "") + "T00:00:00");
  const pd = (n: number) => String(n).padStart(2, "0");
  const iso = isNaN(dt.getTime())
    ? ""
    : `${dt.getFullYear()}-${pd(dt.getMonth() + 1)}-${pd(dt.getDate())}`;
  const place = (s: any) => esc(String(s || "").replace(/_/g, " ").trim().toUpperCase());
  const from = place(t.route_from);
  const to = place(t.route_to);
  const time = esc(t.trip_time || "");
  const driverName = esc(String(drv.name || BAKED_DRIVER.name).toUpperCase());
  const iqama = esc(String(drv.iqama_no || BAKED_DRIVER.iqama));
  const phone = esc(String(drv.phone || BAKED_DRIVER.phone));
  const plate = esc(String(t.vehicle_plate || drv.vehicle_plate || BAKED_DRIVER.plate).toUpperCase());
  const leader = pax[0] || {};
  const leaderName = esc(String(leader.name || "").trim().toUpperCase());
  const paxCount = pax.length ? String(pax.length) : "";

  const html = templateHtml.replace(/<script[\s\S]*?<\/script>/g, "");
  const parts = html.split(/(<div id="pf[123]")/);
  let head = parts[0];
  let p1 = (parts[1] || "") + (parts[2] || "");
  let p2 = (parts[3] || "") + (parts[4] || "");

  const targets: Record<string, string> = {};

  // ---- trip values ----
  if (from) targets["488:953"] = overlay(488, 953, from, 18, 130);
  if (to) targets["298:954"] = overlay(298, 954, to, 18, 130);
  if (iso) targets["57:976"] = overlay(57, 976, iso, 17, 120);
  if (time) targets["78:943"] = overlay(78, 943, time, 17, 120);

  // ---- driver block ----
  if (driverName) {
    targets["727:839"] = overlay(650, 838, driverName, 15, 210);
    targets["677:839"] = "";
    targets["733:839"] = "";
  }
  if (iqama) targets["709:781"] = overlay(709, 781, iqama, 17, 140);
  if (phone) targets["709:718"] = overlay(709, 718, phone, 17, 140);
  if (plate) targets["706:656"] = overlay(706, 656, plate, 16, 150);

  // ---- guest row (one merged sample run covers all cells) ----
  const row =
    (leaderName ? overlay(370, 647, leaderName, 17, 170) : "") +
    (paxCount ? overlay(30, 647, paxCount, 17, 110) : "");
  if (row) targets["419:647"] = row;

  p1 = patch(p1, html, targets);
  if (p2) p2 = patch(p2, html, {});

  // ---- second party inside the contract body ----
  if (leaderName) {
    p1 = p1.replace(SAMPLE_NAME_GLYPHS, "");
    const nameCell = overlayRight(575, 391, leaderName, 17, 135);
    p1 = p1.replace(/(<div class="pc[^"]*">)/, `$1${nameCell}`);
  }

  const css = `
<style>
#sidebar{display:none!important}
#page-container{left:0!important}
.loading-indicator{display:none!important}
@media screen{.pc{display:block!important;opacity:1!important}}
@media print{@page{size:A4;margin:0}html,body{margin:0}.pf{page-break-after:always}}
</style>`;
  head = head
    .replace("</head>", css + "\n</head>")
    .replace("<title></title>", `<title>${esc(t.trip_name || "Trip Manifest")}</title>`);
  return head + p1 + p2;
}