// Builds the trip document for "فرع مؤسسة طائل سعيد ابراهيم الثبيتي للنقليات"
// Driver details (M TAWAF KHAN, iqama 2575680273, plate 7770-LXA, HUNDAI STARIA,
// phone 0509567527) are BAKED IN and never overridden.
// Only date, destination/route, and passenger list are dynamic.

import { esc } from "./mscTemplate.ts";

// Use the uploaded original PDF URL as a stable identifier so the manifest
// builder dispatches to this function.
export const TAIL_SAEED_TEMPLATE_URL =
  "tail-saeed-ibrahim-al-thubaiti";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function fmtDate(d: string): string {
  if (!d) return "";
  const date = new Date(d);
  if (isNaN(date.getTime())) return d;
  const dd = String(date.getDate()).padStart(2, "0");
  return `${dd}-${MONTHS[date.getMonth()]}-${String(date.getFullYear()).slice(-2)}`;
}

const LOGO_SVG = `
<svg width="120" height="80" viewBox="0 0 120 80" xmlns="http://www.w3.org/2000/svg">
  <rect width="120" height="80" rx="6" fill="#1a3a6b"/>
  <text x="60" y="22" text-anchor="middle" font-family="Arial" font-size="8" fill="#fff" font-weight="700">مؤسسة</text>
  <text x="60" y="36" text-anchor="middle" font-family="Arial" font-size="7" fill="#fff" font-weight="700">طائل سعيد ابراهيم الثبيتي</text>
  <text x="60" y="50" text-anchor="middle" font-family="Arial" font-size="7" fill="#ccc">النـقـلـيـــات</text>
  <rect x="10" y="58" width="100" height="14" rx="3" fill="#c0392b"/>
  <text x="60" y="68" text-anchor="middle" font-family="Arial" font-size="7" fill="#fff">للنقليات</text>
</svg>`;

function header(): string {
  return `
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
    <div style="text-align:center;">${LOGO_SVG}</div>
    <div style="flex:1;text-align:center;">
      <div style="font-size:16pt;font-weight:900;color:#1a3a6b;direction:rtl;">فرع مؤسسة</div>
      <div style="font-size:14pt;font-weight:900;color:#1a3a6b;direction:rtl;">طائل سعيد ابراهيم الثبيتي</div>
      <div style="font-size:13pt;font-weight:800;color:#333;direction:rtl;">للنقليات</div>
    </div>
    <div style="text-align:center;">${LOGO_SVG}</div>
  </div>
  <div style="height:3px;background:linear-gradient(to right,#1a3a6b,#c0392b,#1a3a6b);margin-bottom:10px;"></div>`;
}

function contractPage(t: any): string {
  const date = fmtDate(t.travel_date);
  const from = esc((t.route_from || "").toUpperCase());
  const to = esc((t.route_to || "").toUpperCase());
  const passengers = t.passengers || [];
  const leader = esc((passengers[0] || {}).name || "");
  const secondParty = leader
    ? `${leader} / WITH ${Math.max(passengers.length - 1, 0)} MEMBER${passengers.length > 2 ? "S" : ""}`
    : esc(t.second_party_name || "");

  return `
  <div class="ts-page ts-rtl">
    ${header()}
    <div style="text-align:center;margin-bottom:14px;">
      <span style="font-size:14pt;font-weight:900;text-decoration:underline;">عقد نقل على الطرق البرية</span>
    </div>
    <div style="margin-bottom:10px;font-size:11pt;font-weight:700;">التاريخ :&nbsp; <b>${date}</b></div>
    <div style="font-size:10.5pt;line-height:1.9;text-align:justify;font-weight:600;">
      <p style="margin:0 0 8px;">تم ابرام هذا العقد بين المتعاقدين بناء على المادة (٣٩) التاسعة والثلاثون من اللائحة المنظمة لنشاط النقل المتخصص وتأجير وتوجيه الحافلات وبناء على الفقرة (١) من المادة (٣٩) والتي تنص على ان يجب على الناقل ابرام عقد نقل مع الأطراف المحددين في المادة (٤٠) قبل تنفيذ عمليات النقل على الطرق البرية وبما لا يخالف احكام هذه اللائحة ووفقا الألية التي تحددها هيئة النقل وبناء على ما سبق تم ابرام عقد النقل بين الاطراف الأتيه:</p>
      <table style="width:100%;border-collapse:collapse;margin-bottom:6px;">
        <tr>
          <td style="width:30%;font-weight:800;font-size:11pt;color:#c0392b;">الطرف الأول:</td>
          <td style="font-weight:800;font-size:11pt;color:#c0392b;text-align:center;">/ / فرع مؤسسة طائل سعيد ابراهيم الثبيتي</td>
        </tr>
      </table>
      <table style="width:100%;border-collapse:collapse;margin-bottom:10px;">
        <tr>
          <td style="width:30%;background:#2E75B6;color:#fff;font-weight:800;padding:4px 10px;border:1px solid #2E75B6;">الطرف الثاني:</td>
          <td style="border:1.5px solid #333;font-weight:800;font-size:11pt;text-align:center;padding:4px 8px;">${secondParty}</td>
        </tr>
      </table>
      <p style="margin:8px 0;">اتفق الطرفان على أن ينفذ الطرف الأول عملية النقل للطرف الثاني مع مرافقيه وذويهم من الموقع المحدد مسبقا مع الطرف الثاني وتوصيلهم الى الجهه المحدده بالعقد.</p>
      <table style="width:65%;border-collapse:collapse;margin:10px auto;">
        <tr>
          <td style="background:#2E75B6;color:#fff;font-weight:800;padding:4px 12px;border:1px solid #2E75B6;">النقل من /</td>
          <td style="border:1.5px solid #333;font-weight:800;font-size:11pt;text-align:center;padding:4px 10px;">${from}</td>
        </tr>
        <tr>
          <td style="background:#2E75B6;color:#fff;font-weight:800;padding:4px 12px;border:1px solid #2E75B6;">وصولا الى /</td>
          <td style="border:1.5px solid #333;font-weight:800;font-size:11pt;text-align:center;padding:4px 10px;">${to}</td>
        </tr>
      </table>
      <p style="margin:8px 0;">في حالة الغاء التعاقد الى سبب شخصى أو أسباب أخرى تتعلق في الحجوزات تكون سياسة الإلغاء والاستبدال.</p>
      <p style="margin:8px 0;">حسب نظام وزارة التجارة السعودى في حالة الحجز وتم الإلغاء قبل موعد الرحله بأكثر من ٢٤ ساعة يتم استرداد المبلغ كامل.</p>
      <p style="margin:8px 0;">وفي حالة طلب الطرف الثاني الحجز من خلال الموقع الالكتروني للمؤسسه يعتبر هذا الحجز وموافقته على الشروط والاحكام بالموقع الالكتروني هو موافقة على هذا العقد لتنفيذ عملية النقل المتفق عليها مع الطرف الاول بواسطة حافلات المؤسسة المرخصه والمتوافقه مع الاشتراطات المقررة من هيئة النقل.</p>
    </div>
    <div style="text-align:center;margin-top:30px;font-size:13pt;font-weight:900;font-family:'Noto Nastaliq Urdu',Georgia,serif;direction:rtl;">متجه منالى</div>
  </div>`;
}

function manifestPage(t: any): string {
  const date = fmtDate(t.travel_date);
  const time = esc(t.trip_time || "");
  const from = esc((t.route_from || "").toUpperCase());
  const to = esc((t.route_to || "").toUpperCase());
  const dest = from && to ? `${from} TO ${to}` : "";
  const passengers = t.passengers || [];

  // Build up to 23 passenger rows (as in the original PDF)
  let rows = "";
  for (let i = 0; i < 23; i++) {
    const p = passengers[i] || {};
    rows += `<tr>
      <td style="border:1px solid #555;padding:4px 6px;text-align:center;font-weight:700;">${esc(p.nationality || "")}</td>
      <td style="border:1px solid #555;padding:4px 6px;text-align:center;font-weight:700;">${esc(p.id_number || "")}</td>
      <td style="border:1px solid #555;padding:4px 6px;text-align:center;font-weight:700;">${esc(p.name || "")}</td>
      <td style="border:1px solid #555;padding:4px 6px;text-align:center;font-weight:900;background:#1a3a6b;color:#fff;">${i + 1}.</td>
    </tr>`;
  }

  return `
  <div class="ts-page">
    ${header()}
    <table style="width:100%;border-collapse:collapse;margin-bottom:8px;font-size:10pt;">
      <tr>
        <th style="border:1px solid #555;background:#1a3a6b;color:#fff;padding:5px 8px;text-align:center;">رقم الهاتف</th>
        <th style="border:1px solid #555;background:#1a3a6b;color:#fff;padding:5px 8px;text-align:center;">رقم القامة</th>
        <th style="border:1px solid #555;background:#1a3a6b;color:#fff;padding:5px 8px;text-align:center;">اسم السائق</th>
        <th style="border:1px solid #555;background:#1a3a6b;color:#fff;padding:5px 8px;text-align:center;">رقم اللوحة</th>
        <th style="border:1px solid #555;background:#1a3a6b;color:#fff;padding:5px 8px;text-align:center;">نوع السيارة</th>
      </tr>
      <tr>
        <td style="border:1px solid #555;padding:5px 8px;text-align:center;font-weight:700;">0509567527</td>
        <td style="border:1px solid #555;padding:5px 8px;text-align:center;font-weight:700;">2575680273</td>
        <td style="border:1px solid #555;padding:5px 8px;text-align:center;font-weight:700;">M TAWAF KHAN</td>
        <td style="border:1px solid #555;padding:5px 8px;text-align:center;font-weight:700;">7770 – LXA</td>
        <td style="border:1px solid #555;padding:5px 8px;text-align:center;font-weight:700;">HUNDAI STARIA</td>
      </tr>
    </table>
    <table style="width:100%;border-collapse:collapse;margin-bottom:10px;font-size:10pt;">
      <tr>
        <th style="border:1px solid #555;background:#1a3a6b;color:#fff;padding:5px 8px;text-align:center;" colspan="2">المالحظات</th>
        <th style="border:1px solid #555;background:#1a3a6b;color:#fff;padding:5px 8px;text-align:center;">التاريخ</th>
        <th style="border:1px solid #555;background:#1a3a6b;color:#fff;padding:5px 8px;text-align:center;">وقت</th>
      </tr>
      <tr>
        <td style="border:1px solid #555;padding:5px 8px;text-align:center;font-weight:700;" colspan="2">${dest}</td>
        <td style="border:1px solid #555;padding:5px 8px;text-align:center;font-weight:700;">${date}</td>
        <td style="border:1px solid #555;padding:5px 8px;text-align:center;font-weight:700;">${time}</td>
      </tr>
    </table>
    <table style="width:100%;border-collapse:collapse;font-size:10pt;">
      <tr>
        <th style="border:1px solid #555;background:#1a3a6b;color:#fff;padding:5px 8px;text-align:center;width:22%;">الجنسية</th>
        <th style="border:1px solid #555;background:#1a3a6b;color:#fff;padding:5px 8px;text-align:center;width:30%;">رقم الجواز</th>
        <th style="border:1px solid #555;background:#1a3a6b;color:#fff;padding:5px 8px;text-align:center;width:38%;">اسم الضيف</th>
        <th style="border:1px solid #555;background:#1a3a6b;color:#fff;padding:5px 8px;text-align:center;width:10%;">م</th>
      </tr>
      ${rows}
    </table>
    <div style="text-align:center;margin-top:24px;font-size:13pt;font-weight:900;font-family:'Noto Nastaliq Urdu',Georgia,serif;direction:rtl;">متجه منالى</div>
  </div>`;
}

export function buildFromTailSaeedTemplate(_html: string, trip: any): string {
  const t = trip || {};
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<title>${esc(t.trip_name || "Trip Manifest")}</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap');
*{box-sizing:border-box;}
body{margin:0;background:#e5e7eb;font-family:'Cairo',Arial,sans-serif;color:#111;}
.ts-page{
  width:210mm;min-height:297mm;background:#fff;margin:0 auto 16px;
  padding:8mm 12mm 28mm;position:relative;font-size:10.5pt;line-height:1.5;
}
.ts-rtl{direction:rtl;}
@media print{
  body{background:#fff;}
  .ts-page{margin:0;page-break-after:always;}
  @page{size:A4;margin:0;}
}
</style>
</head>
<body>
${contractPage(t)}
${manifestPage(t)}
</body>
</html>`;
}