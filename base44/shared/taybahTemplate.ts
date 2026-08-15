// Muassasat Taybah Al-Fakhmah (مؤسسة طيبة الفخمة للنقل البرى) manifest builder.
// Generates a self-contained 3-page HTML document:
//   p1 = Arabic contract
//   p2 = Manifest (header, 2-driver vehicle row, passenger table up to 14 rows)
//   p3 = Daily vehicle inspection log
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
  <div style="background:linear-gradient(135deg,#1a3a5c 0%,#2a5a8c 100%);color:#fff;padding:18px 30px 14px;display:flex;align-items:center;justify-content:space-between;border-radius:0 0 8px 8px">
    <div>
      <div style="font-size:28px;font-weight:900;font-family:'Arial',sans-serif;direction:rtl;letter-spacing:1px">مؤسسة طيبة الفخمة للنقل البرى</div>
      <div style="font-size:16px;margin-top:4px;letter-spacing:2px;opacity:.9">س ت &nbsp;&nbsp;&nbsp; 4031310144</div>
    </div>
    <div style="background:#fff;border-radius:50%;width:72px;height:72px;display:flex;align-items:center;justify-content:center;flex-shrink:0">
      <div style="text-align:center;line-height:1.1">
        <div style="color:#1a3a5c;font-size:22px;font-weight:900;font-family:'Georgia',serif;font-style:italic">JK</div>
        <div style="color:#1a3a5c;font-size:9px;font-weight:700">الفخمة</div>
        <div style="color:#8b7a3a;font-size:8px">Luxury</div>
      </div>
    </div>
  </div>`;

const FOOTER_HTML = `
  <div style="text-align:center;font-size:11px;color:#1a3a5c;border-top:2px solid #1a3a5c;padding-top:8px;margin-top:10px;direction:rtl">
    <div style="font-size:13px;font-weight:700">الصمرة الجديدة &nbsp;-&nbsp; النوارية &nbsp;-&nbsp; مكة المكرمة &nbsp; 📍</div>
    <div style="direction:ltr;margin-top:2px">Umrah Jadidah &nbsp;-&nbsp; An Nawaria &nbsp;-&nbsp; Makkah Al Mukarrmah &nbsp; 📍</div>
    <div style="margin-top:3px;font-weight:700">+966572491353</div>
  </div>`;

const PAGE_STYLE = `
  display:block;width:210mm;min-height:297mm;padding:0;margin:0 auto 20px;
  background:#fff;box-shadow:0 2px 12px rgba(0,0,0,.18);
  font-family:Arial,Helvetica,sans-serif;box-sizing:border-box;page-break-after:always;`;

const TD = (content: string, extra = "") =>
  `<td style="border:1px solid #1a3a5c;padding:5px 8px;text-align:center;${extra}">${content}</td>`;

const TH = (content: string, extra = "") =>
  `<td style="border:1px solid #1a3a5c;padding:5px 8px;text-align:center;background:#1a3a5c;color:#fff;font-weight:700;font-size:12px;${extra}">${content}</td>`;

const CHECK = `<span style="font-size:14px">&#10003;</span>`;
const BOX = `<span style="display:inline-block;width:14px;height:14px;border:1px solid #444;vertical-align:middle"></span>`;

function inspectionRow(label: string) {
  return `<tr>
    <td style="border:1px solid #555;padding:4px 6px;text-align:right;direction:rtl;font-size:12px">${label}</td>
    ${TD(CHECK, "width:60px")}
    ${TD(BOX, "width:60px")}
    ${TD("", "width:80px")}
  </tr>`;
}

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
  const leader = passengers[0] ? esc(passengers[0].name) : "";
  const rest = Math.max(passengers.length - 1, 0);
  const secondParty = leader
    ? `${leader} and ${rest} member${rest === 1 ? "" : "s"}`
    : esc(t.second_party_name || "");

  // ========== PAGE 1: CONTRACT ==========
  const p1 = `<div class="doc-page" style="${PAGE_STYLE}padding:0">
  <div style="padding:0 0 24px">
    ${HEADER_HTML}
    <div style="padding:18px 30px">
      <h2 style="text-align:center;font-size:20px;direction:rtl;color:#1a3a5c;margin:0 0 18px">عقد نقل على الطريق البريه</h2>
      <table style="width:100%;margin-bottom:14px;direction:rtl;font-size:13px">
        <tr><td style="width:120px;font-weight:700">تاريخ :</td><td>${date}</td></tr>
      </table>
      <div style="direction:rtl;font-size:12.5px;line-height:2;color:#222">
        <p>تم إبرام هذا العقد بين المتعاقدين بناء على المادة(39) التاسعه والثلاثون من اللائحه المنظمة للنشاط النقل المتخصص وتأجير وتوجيه الحافلات
        وبناء على الفقرة (1) من المادة (39) والتي تنص على أن يجب على الناقل إبرام عقد نقل مع الاطراف المحددين في المادة(40) قبل تنفيذ عمليات
        النقل على الطرق البرية بما لا يخالف أحكام هذه اللائحه ووفقاً للتاليه التي تحددها هنة النقل. وبناء على ما سبق تم إبرام عقد بين الاطراف الاتيه:</p>
        <p><strong>لطرف الاول :</strong> - مؤسسة طيبة الفخمة للنقل البرى &nbsp;&nbsp; س ت &nbsp;&nbsp; 4031310144</p>
        <p><strong>الطرف الثاني :</strong> - ${secondParty}</p>
        <p>اتفق الطرفان على أن ينفذ الطرف الاول عمليه نقل للطرف الثاني مع مرافقيه وذويهم من الموقع المحدد مسبقا من الطرف الثاني وتوصيلاهم الى الجهه المحدده .بالعقد</p>
        <p><strong>النقل من :</strong> - ${from}</p>
        <p><strong>وصولا الى :</strong> - ${to}</p>
        <p>في حال إلغاء التعاقد لأي سبب شخصي او اسباب اخرى تتعلق في الحجوزات او الانظمه تكون سياسة الالغاء والاستبدال حسب نظام وزارة التجارة
        السعودي في حاله الحجز وتم الإلغاء قبل موعد الرحله ب 24 ساعه يتم استرداد المبلغ كامل</p>
        <p>في حالة طلب الطرف الثاني الحجز من خلال الموقع الالكتروني للمؤسسة يعتبر هذا الحجز وموافقته على الشروط والأحكام بالموقع الالكتروني هو
        موافقه على هذا العقد لتنفيذ عملية النقل المتفق عليها مع الطرف الاول بواسطة حافلات المؤسسة المرخصة والمتوافقه مع الاشتراطات المقرره من هيئة النقل</p>
      </div>
    </div>
    ${FOOTER_HTML}
  </div>
</div>`;

  // ========== PAGE 2: MANIFEST ==========
  const paxRows = passengers.slice(0, 14).map((p: any, i: number) => `<tr>
    ${TD(String(i + 1), "width:30px;font-weight:700")}
    ${TD(esc(p.name || ""), "font-weight:700;font-size:13px")}
    ${TD(esc(p.id_number || ""), "font-size:12px")}
  </tr>`).join("");

  // Fill remaining empty rows up to 14
  const emptyRows = Array.from({ length: Math.max(0, 14 - passengers.length) }, (_, i) => `<tr>
    ${TD(String(passengers.length + i + 1), "width:30px;color:#999")}
    ${TD("", "height:26px")}
    ${TD("")}
  </tr>`).join("");

  const p2 = `<div class="doc-page" style="${PAGE_STYLE}padding:0">
  <div style="padding:0 0 18px">
    ${HEADER_HTML}
    <div style="padding:14px 30px">
      <h2 style="text-align:center;font-size:18px;direction:rtl;color:#1a3a5c;margin:0 0 12px">بيانات الركاب</h2>
      <table style="width:100%;border-collapse:collapse;margin-bottom:12px;direction:rtl">
        <tr>
          ${TH("التاريخ")}
          ${TH("اسم الجهته")}
        </tr>
        <tr>
          ${TD(date, "font-weight:700;font-size:14px")}
          ${TD(`${from} - ${to}`, "font-weight:700;font-size:13px")}
        </tr>
      </table>
      <table style="width:100%;border-collapse:collapse;margin-bottom:8px;direction:rtl;font-size:12px">
        <tr>
          ${TH("السيارة نوع / Vehicle Type")}
          ${TH("اللوحه رقم / Vehicle No")}
          ${TH("السائق اسم / Driver Name")}
          ${TH("الهويه رقم / Driver id")}
        </tr>
        <tr>
          ${TD(carModel || "starex", "font-weight:700")}
          ${TD(plate || "RXA 9778", "font-weight:700")}
          ${TD(esc(d1.name || ""), "font-weight:700")}
          ${TD(esc(d1.iqama_no || ""), "font-weight:700")}
        </tr>
        ${d2.name ? `<tr>
          ${TD("")}
          ${TD("")}
          ${TD(esc(d2.name), "font-weight:700")}
          ${TD(esc(d2.iqama_no || ""), "font-weight:700")}
        </tr>` : ""}
      </table>
      <h3 style="text-align:center;color:#1a3a5c;direction:rtl;font-size:15px;margin:10px 0 8px">معلومات اضبيوف</h3>
      <table style="width:100%;border-collapse:collapse;direction:rtl;font-size:12px">
        <tr>
          ${TH("الرقم", "width:36px")}
          ${TH("اسم المصتمرين")}
          ${TH("رقم جواز السفر رقم التاشيره ته")}
        </tr>
        ${paxRows}
        ${emptyRows}
      </table>
      <div style="direction:rtl;font-size:11px;margin-top:10px;background:#f5f5f5;padding:8px 12px;border-radius:4px">
        <strong>(ملاحظه هامة)</strong><br>
        في حال عدم تطابق بيانات الضبيوف مع الاثباتات نكن عرضه الجزاء وهلوم تحمل منا بذالك
      </div>
    </div>
    ${FOOTER_HTML}
  </div>
</div>`;

  // ========== PAGE 3: INSPECTION LOG ==========
  const inspItems1 = [
    "مؤشر الوقود – Fuel gauge",
    "مؤشر الحرارة – Temperature gauge",
    "مؤشر ضغط الزيت – Oil pressure gauge",
    "لمبة فحص المحرك – Check engin light",
    "ABS – ABS Light",
    "لمبات التحذير – Warning Light"
  ];
  const inspItems2 = [
    "الإطارات و ضغط الهواء – Tires and Air",
    "الأنوار الأمامية و الخلفية – Headlights and Taillights",
    "الإشارات التحذيريه – Warning Signals",
    "الزجاج و المرايا – Glass and Mirrors",
    "عدم وجود تسريبات – No leaks"
  ];
  const inspItems3 = [
    "طفاية حريق سارية الصلاحية – Validfireextinguisher",
    "مثلث تحذيري – Warning Triangle",
    "حقيبة إسعافات اولية – First aid kit",
    "مطرقه كسر الزجاج – Glass breakr hammer",
    "أحزمة الألامان – Safety belts"
  ];

  const p3 = `<div class="doc-page" style="${PAGE_STYLE}padding:0">
  <div style="padding:0 0 18px">
    ${HEADER_HTML}
    <div style="padding:14px 30px">
      <h2 style="text-align:center;color:#1a3a5c;direction:rtl;font-size:16px;margin:0 0 4px">سجل الفحص اليومي للسيارة</h2>
      <h3 style="text-align:center;color:#444;font-size:13px;margin:0 0 14px">Daily vehicle inspection log</h3>
      <table style="width:100%;border-collapse:collapse;margin-bottom:14px;direction:rtl;font-size:12px">
        <tr>
          ${TH("إسم السائق")}
          ${TH("لوحة المركبة")}
          ${TH("التاريخ")}
          ${TH("وقت الفحص")}
        </tr>
        <tr>
          ${TD(esc(d1.name || ""), "font-weight:700;font-size:13px")}
          ${TD(plate, "font-weight:700")}
          ${TD(date, "font-weight:700")}
          ${TD(time || "05:00 AM", "font-weight:700")}
        </tr>
      </table>

      <div style="font-weight:700;margin-bottom:4px;direction:rtl;font-size:12px">
        أول أ : فحص مؤشرات لوحة القيادة : &nbsp;&nbsp; <span style="direction:ltr;float:left">First: Check the dashboard indicators :</span>
      </div>
      <table style="width:100%;border-collapse:collapse;margin-bottom:12px;font-size:12px">
        <tr>
          ${TH("البند – Item", "text-align:right;direction:rtl")}
          ${TH("سليم – Sound", "width:60px")}
          ${TH("غير سليم – Unsound", "width:70px")}
          ${TH("ملاحظات – Notes", "width:80px")}
        </tr>
        ${inspItems1.map(inspectionRow).join("")}
      </table>

      <div style="font-weight:700;margin-bottom:4px;direction:rtl;font-size:12px">
        ثانيا : الفحص الخارجي : &nbsp;&nbsp; <span style="direction:ltr;float:left">Second: External inspection :</span>
      </div>
      <table style="width:100%;border-collapse:collapse;margin-bottom:12px;font-size:12px">
        <tr>
          ${TH("البند – Item", "text-align:right;direction:rtl")}
          ${TH("سليم – Sound", "width:60px")}
          ${TH("غير سليم – Unsound", "width:70px")}
          ${TH("ملاحظات – Notes", "width:80px")}
        </tr>
        ${inspItems2.map(inspectionRow).join("")}
      </table>

      <div style="font-weight:700;margin-bottom:4px;direction:rtl;font-size:12px">
        ثالثا : أدوات و متطلبات الألامن و السلامة : &nbsp;&nbsp; <span style="direction:ltr;float:left">Third: Safety and security tools and requirements :</span>
      </div>
      <table style="width:100%;border-collapse:collapse;margin-bottom:12px;font-size:12px">
        <tr>
          ${TH("البند – Item", "text-align:right;direction:rtl")}
          ${TH("سليم – Sound", "width:60px")}
          ${TH("غير سليم – Unsound", "width:70px")}
          ${TH("ملاحظات – Notes", "width:80px")}
        </tr>
        ${inspItems3.map(inspectionRow).join("")}
      </table>

      <div style="direction:rtl;font-size:13px;font-weight:700;margin-top:10px">إقرار :-</div>
      <div style="direction:rtl;font-size:12px;line-height:1.8;margin-top:4px">
        أقر أنا السائق أعلاه بأنني قمت بفحص الحافلة و التأكد من سلامتها و
        جاهزيتها قبل التشغيل . إسم السائق . ....<strong>${esc(d1.name || "")}</strong>....
      </div>
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