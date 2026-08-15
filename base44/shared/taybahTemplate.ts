// Muassasat Taybah Al-Fakhmah (مؤسسة طيبة الفخمة للنقل البرى) manifest builder.
// Uses the company's uploaded scanned template (image PDF) as the background
// and overlays trip data (date, driver, passengers, vehicle) on top at fixed
// coordinates. Coordinates are expressed as percentages of the page and are
// easy to fine-tune.
import { esc } from "./mscTemplate.ts";

export const TAYBAH_TEMPLATE_URL = "taybah-fakhmah";

// Uploaded template (scanned image PDF wrapped as .txt)
const TAYBAH_UPLOADED_URL =
  "https://base44.app/api/apps/6a5cef68337f5303ffc014f5/files/mp/public/6a5cef68337f5303ffc014f5/ebe2a02d9_template-1786807320060.txt";

let templateCache: string | null = null;

async function fetchTemplate(): Promise<string> {
  if (templateCache) return templateCache;
  const res = await fetch(TAYBAH_UPLOADED_URL);
  if (!res.ok) throw new Error("taybah template fetch failed: " + res.status);
  templateCache = await res.text();
  return templateCache;
}

// Extract the first <image> base64 PNG from each .page div.
function extractPageImages(html: string): string[] {
  const images: string[] = [];
  const pageRe = /<div\s+class="page"\s+id="page\d"[\s\S]*?<image[^>]*xlink:href="data:image\/png;base64,([^"]+)"/g;
  let m: RegExpExecArray | null;
  while ((m = pageRe.exec(html)) && images.length < 3) {
    images.push("data:image/png;base64," + m[1]);
  }
  return images;
}

function fmtDate(d: string): string {
  if (!d) return "";
  const dt = new Date(d + "T00:00:00");
  if (isNaN(dt.getTime())) return d;
  return `${dt.getDate()}/${dt.getMonth() + 1}/${dt.getFullYear()}`;
}

// Overlay a value: white box to cover baked text + the real value on top.
// All positions are percentages [top, right, width, height] of the page.
function overlay(top: number, right: number, width: number, height: number, value: string, extra = ""): string {
  if (!value) return "";
  return `<div style="position:absolute;top:${top}%;right:${right}%;width:${width}%;height:${height}%;display:flex;align-items:center;justify-content:center;background:#fff;color:#000;font-family:Arial,sans-serif;font-weight:700;font-size:13px;text-align:center;direction:ltr;${extra}">${value}</div>`;
}

const PAGE_CSS = `width:1240px;height:1754px;position:relative;background:#fff;background-size:100% 100%;background-repeat:no-repeat;margin:0 auto 20px;box-shadow:0 2px 12px rgba(0,0,0,.18);page-break-after:always;overflow:hidden;`;

export async function buildFromTaybahTemplate(_templateHtml: string, trip: any): Promise<string> {
  const t = trip || {};
  const passengers = t.passengers || [];
  const drivers = t.drivers || [];
  const d1 = drivers[0] || {};
  const d2 = drivers[1] || {};
  const date = fmtDate(t.travel_date);
  const time = esc(t.trip_time || "");
  const plate = esc(t.vehicle_plate || "");
  const carModel = esc(t.car_model || "");
  const secondParty = esc(t.second_party_name || "");

  const html = await fetchTemplate();
  const imgs = extractPageImages(html);
  const img1 = imgs[0] || "";
  const img2 = imgs[1] || "";
  const img3 = imgs[2] || "";

  // ===== PAGE 1: Contract — only the date is dynamic =====
  // Date field sits on the right side below the title.
  const p1 = `<div class="doc-page" style="${PAGE_CSS}background-image:url('${img1}')">
    ${overlay(28, 10, 16, 3.2, date)}
  </div>`;

  // ===== PAGE 2: Driver table + passenger table =====
  // Driver rows (up to 2). Columns (RTL): date | entity | iqama | name | plate | car type
  // Row Y positions estimated from the scanned template.
  const driverRow = (d: any, topY: number) => `
    ${overlay(topY, 67, 13, 3.0, esc(d.iqama_no || ""))}
    ${overlay(topY, 47, 19, 3.0, esc(d.name || ""), "font-size:11px")}
    ${overlay(topY, 31, 14, 3.0, plate)}
    ${overlay(topY, 16, 13, 3.0, carModel, "text-transform:uppercase")}
  `;
  const driverRows = driverRow(d1, 33) + (d2.name ? driverRow(d2, 37.5) : "");
  // Date + entity on first row only
  const tripHeader = `
    ${overlay(33, 84, 13, 3.0, date)}
    ${overlay(33, 97, 0, 0, "")}
  `;

  // Passenger rows (up to 14). Each row: number | name | passport.
  const paxRows = passengers.map((p: any, i: number) => {
    const topY = 50 + i * 3.5;
    return `
      ${overlay(topY, 92, 6, 3.0, String(i + 1))}
      ${overlay(topY, 48, 42, 3.0, esc(p.name || ""), "font-size:11px")}
      ${overlay(topY, 8, 38, 3.0, esc(p.id_number || ""))}
    `;
  }).join("");

  const p2 = `<div class="doc-page" style="${PAGE_CSS}background-image:url('${img2}')">
    ${tripHeader}
    ${driverRows}
    ${paxRows}
  </div>`;

  // ===== PAGE 3: Inspection log header (driver, plate, date, time) =====
  const p3 = `<div class="doc-page" style="${PAGE_CSS}background-image:url('${img3}')">
    ${overlay(17, 73, 22, 3.2, esc(d1.name || ""), "font-size:11px")}
    ${overlay(17, 50, 18, 3.2, plate)}
    ${overlay(17, 27, 18, 3.2, date)}
    ${overlay(17, 8, 16, 3.2, `<span dir="ltr">${time}</span>`)}
  </div>`;

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${esc(t.trip_name || "Trip Manifest")}</title>
<style>
  body{margin:0;padding:20px;background:#e8e8e8;font-family:Arial,Helvetica,sans-serif}
  @media print{
    body{background:#fff;padding:0}
    .doc-page{box-shadow:none!important;margin:0!important;page-break-after:always}
  }
</style>
</head>
<body>
${p1}
${p2}
${p3}
</body>
</html>`;
}