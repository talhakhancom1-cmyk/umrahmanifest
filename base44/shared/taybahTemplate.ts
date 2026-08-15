// Muassasat Taybah Al-Fakhmah (مؤسسة طيبة الفخمة للنقل البرى) manifest builder.
// Generates a self-contained 3-page HTML document:
//   p1 = Trip info (date / time / destination)
//   p2 = Driver info (driver + optional second driver + vehicle)
//   p3 = Passenger data (guest list up to 14 rows)
// No external template file needed — layout is generated programmatically.
import { esc } from "./mscTemplate.ts";

export const TAYBAH_TEMPLATE_URL = "taybah-fakhmah";

function fmtDate(d: string): string {
  if (!d) return "";
  const dt = new Date(d + "T00:00:00");
  if (isNaN(dt.getTime())) return d;
  return `${dt.getDate()}/${dt.getMonth() + 1}/${dt.getFullYear()}`;
}

const HEADER_HTML = `
  <div style="position:relative;background:#fff;overflow:hidden">
    <div style="position:absolute;top:0;left:0;right:0;height:96px;background:linear-gradient(90deg,#4a89a5 0%,#1a5f7a 100%);clip-path:polygon(0 0,100% 0,100% 72%,0 100%)"></div>
    <div style="position:relative;display:flex;align-items:center;justify-content:space-between;padding:16px 30px;direction:rtl">
      <div style="color:#fff">
        <div style="font-size:26px;font-weight:900;font-family:'Arial',sans-serif;letter-spacing:1px">مؤسسة طيبة الفخمة للنقل البرى</div>
        <div style="font-size:15px;margin-top:4px;letter-spacing:2px;opacity:.95">س ت &nbsp;&nbsp; 4031310144</div>
      </div>
      <div style="background:#fff;border-radius:50%;width:68px;height:68px;display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 2px 6px rgba(0,0,0,.15)">
        <div style="text-align:center;line-height:1.1">
          <div style="color:#1a5f7a;font-size:30px;font-weight:900;font-family:'Georgia',serif;font-style:italic">R</div>
          <div style="color:#1a5f7a;font-size:9px;font-weight:700">الفخمة</div>
          <div style="color:#8b7a3a;font-size:7px">Luxury</div>
        </div>
      </div>
    </div>
  </div>`;

const FOOTER_HTML = `
  <div style="text-align:center;font-size:11px;color:#1a5f7a;border-top:2px solid #1a5f7a;padding-top:8px;margin-top:10px;direction:rtl">
    <div style="font-size:13px;font-weight:700">العمرة الجديدة &nbsp;-&nbsp; النوارية &nbsp;-&nbsp; مكة المكرمة &nbsp; 📍</div>
    <div style="direction:ltr;margin-top:2px">Umrah Jadidah &nbsp;-&nbsp; An Nawaria &nbsp;-&nbsp; Makkah Al Mukarramah &nbsp; 📍</div>
    <div style="margin-top:3px;font-weight:700">+966572491353</div>
  </div>`;

const PAGE_STYLE = `
  display:block;width:210mm;min-height:297mm;padding:0;margin:0 auto 20px;
  background:#fff;box-shadow:0 2px 12px rgba(0,0,0,.18);
  font-family:Arial,Helvetica,sans-serif;box-sizing:border-box;page-break-after:always;`;

const TD = (content: string, extra = "") =>
  `<td style="border:1px solid #1a5f7a;padding:5px 8px;text-align:center;${extra}">${content}</td>`;

const TH = (content: string, extra = "") =>
  `<td style="border:1px solid #1a5f7a;padding:5px 8px;text-align:center;background:#1a5f7a;color:#fff;font-weight:700;font-size:12px;${extra}">${content}</td>`;

export function buildFromTaybahTemplate(_templateHtml: string, trip: any): string {
  const t = trip || {};
  const passengers = t.passengers || [];
  const drivers = t.drivers || [];
  const d1 = drivers[0] || {};
  const d2 = drivers[1] || {};
  const date = fmtDate(t.travel_date);
  const time = esc(t.trip_time || "");
  const from = esc((t.route_from || "").replace(/_/g, " "));
  const to = esc((t.route_to || "").replace(/_/g, " "));
  const plate = esc(t.vehicle_plate || "");
  const carModel = esc(t.car_model || "");

  // ========== PAGE 1: TRIP INFO (date / time / destination) ==========
  const p1 = `<div class="doc-page" style="${PAGE_STYLE}padding:0">
  <div style="padding:0 0 24px">
    ${HEADER_HTML}
    <div style="padding:30px 30px">
      <h2 style="text-align:center;font-size:20px;direction:rtl;color:#1a5f7a;margin:0 0 22px">بيانات الرحلة</h2>
      <table style="width:100%;border-collapse:collapse;direction:rtl;font-size:14px">
        <tr>
          ${TH("التاريخ / Date", "width:40%")}
          ${TD(date || "&nbsp;", "font-weight:700;font-size:16px")}
        </tr>
        <tr>
          ${TH("الوقت / Time")}
          ${TD(`<span dir="ltr">${time || "&nbsp;"}</span>`, "font-weight:700;font-size:16px")}
        </tr>
        <tr>
          ${TH("النقل من / From")}
          ${TD(from || "&nbsp;", "font-weight:700;font-size:16px")}
        </tr>
        <tr>
          ${TH("وصولا الى / To")}
          ${TD(to || "&nbsp;", "font-weight:700;font-size:16px")}
        </tr>
      </table>
    </div>
    ${FOOTER_HTML}
  </div>
</div>`;

  // ========== PAGE 2: DRIVER INFO ==========
  const p2 = `<div class="doc-page" style="${PAGE_STYLE}padding:0">
  <div style="padding:0 0 18px">
    ${HEADER_HTML}
    <div style="padding:30px 30px">
      <h2 style="text-align:center;font-size:20px;direction:rtl;color:#1a5f7a;margin:0 0 22px">بيانات السائق</h2>
      <table style="width:100%;border-collapse:collapse;direction:rtl;font-size:14px;margin-bottom:10px">
        <tr>
          ${TH("السائق / Driver", "width:40%")}
          ${TD(esc(d1.name || "&nbsp;"), "font-weight:700;font-size:16px")}
        </tr>
        <tr>
          ${TH("الهوية / Iqama No")}
          ${TD(esc(d1.iqama_no || "&nbsp;"), "font-weight:700;font-size:16px")}
        </tr>
        <tr>
          ${TH("نوع السيارة / Vehicle Type")}
          ${TD(carModel || "&nbsp;", "font-weight:700;font-size:16px")}
        </tr>
        <tr>
          ${TH("رقم اللوحة / Plate No")}
          ${TD(plate || "&nbsp;", "font-weight:700;font-size:16px")}
        </tr>
      </table>
      ${d2.name ? `<h3 style="text-align:center;color:#1a5f7a;direction:rtl;font-size:16px;margin:18px 0 12px">السائق الثاني</h3>
      <table style="width:100%;border-collapse:collapse;direction:rtl;font-size:14px">
        <tr>
          ${TH("السائق / Driver", "width:40%")}
          ${TD(esc(d2.name), "font-weight:700;font-size:16px")}
        </tr>
        <tr>
          ${TH("الهوية / Iqama No")}
          ${TD(esc(d2.iqama_no || "&nbsp;"), "font-weight:700;font-size:16px")}
        </tr>
      </table>` : ""}
    </div>
    ${FOOTER_HTML}
  </div>
</div>`;

  // ========== PAGE 3: PASSENGER DATA ==========
  const paxRows = passengers.map((p: any, i: number) => `<tr>
    ${TD(String(i + 1), "width:30px;font-weight:700")}
    ${TD(esc(p.name || ""), "font-weight:700;font-size:13px")}
    ${TD(esc(p.id_number || ""), "font-size:12px")}
  </tr>`).join("");

  // Fill empty rows up to 14
  const emptyRows = Array.from({ length: Math.max(0, 14 - passengers.length) }, (_, i) => `<tr>
    ${TD(String(passengers.length + i + 1), "width:30px;color:#999")}
    ${TD("", "height:26px")}
    ${TD("")}
  </tr>`).join("");

  const p3 = `<div class="doc-page" style="${PAGE_STYLE}padding:0">
  <div style="padding:0 0 18px">
    ${HEADER_HTML}
    <div style="padding:14px 30px">
      <h2 style="text-align:center;font-size:18px;direction:rtl;color:#1a5f7a;margin:0 0 12px">معلومات الضيوف</h2>
      <table style="width:100%;border-collapse:collapse;direction:rtl;font-size:12px">
        <tr>
          ${TH("الرقم", "width:36px")}
          ${TH("اسم المعتمرين")}
          ${TH("رقم جواز السفر / رقم التأشيرة")}
        </tr>
        ${paxRows}
        ${emptyRows}
      </table>
    </div>
    ${FOOTER_HTML}
  </div>
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