// Master HTML template for the 3-page trip manifest document.
// Single source of truth — used by the generateManifest backend function
// (which serves both the app document page and the Telegram flow).

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function fmtDate(d) {
  if (!d) return "";
  const date = new Date(d);
  if (isNaN(date.getTime())) return d;
  const day = String(date.getDate()).padStart(2, "0");
  return `${day}-${MONTHS[date.getMonth()]}-${String(date.getFullYear()).slice(-2)}`;
}

function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

const NAVY = "#1F3864";
const BLUE = "#2E75B6";
const RED = "#C00000";

function headerHtml(t) {
  const nameAr = esc(t.company_name_ar || "شركة مرجان الشرقية للمقاولات العامة");
  const nameEn = esc(t.company_name || "MURJAN AL-SHARQIYA General Contracting Co.");
  const cr = esc(t.cr_number || "2055010235");
  const logo = t.logo_url
    ? `<img src="${esc(t.logo_url)}" style="height:64px;object-fit:contain;" />`
    : `<div class="msc-logo"><span class="m">M</span><span class="sc">SC</span></div>`;
  return `
  <div class="doc-header">
    <div class="doc-header-row">
      ${logo}
      <div class="doc-header-text">
        <div class="co-ar">${nameAr}</div>
        <div class="co-sub">ذات مسـئولية محـدودة &ndash; س.ت ${cr}</div>
        <div class="co-en">${nameEn}</div>
        <div class="co-cr">Limited Responsibility - C.R. ${cr}</div>
      </div>
    </div>
    <div class="header-bar"></div>
  </div>`;
}

function footerHtml(t) {
  const ar = esc(t.footer_ar || "المملكة العربية السعودية - الجبيل - تلفون: 013 3633115 - فاكس: 013 3622264 - ص.ب 3107 - واصل - الجبيل 35513 - 9278");
  const en = esc(t.footer_en || "Saudi Arabia - Jubail - Tel.: 013 363 3115 - Fax: 013 362 2264 - P.O. Box 3107 - Wasel - Jubail 35513 - 9278");
  return `
  <div class="doc-footer">
    <div>${ar}</div>
    <div>${en}</div>
    <div>E-mail : info@msc.sa.com &nbsp;|&nbsp; www.msc.sa.com</div>
  </div>`;
}

function stampHtml(t, style) {
  if (t.stamp_url) {
    return `<div class="stamp" style="${style}"><img src="${esc(t.stamp_url)}" style="width:110px;height:110px;object-fit:contain;" /></div>`;
  }
  const cr = esc(t.cr_number || "2055010235");
  return `
  <div class="stamp" style="${style}">
    <svg viewBox="0 0 200 200" width="110" height="110" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <path id="ta" d="M 25 100 A 75 75 0 0 1 175 100" fill="none"/>
        <path id="ba" d="M 175 100 A 75 75 0 0 1 25 100" fill="none"/>
      </defs>
      <circle cx="100" cy="100" r="92" fill="none" stroke="#1a5c8a" stroke-width="2.5"/>
      <circle cx="100" cy="100" r="85" fill="none" stroke="#1a5c8a" stroke-width="1"/>
      <text x="100" y="88" text-anchor="middle" font-size="12" fill="#1a5c8a" font-weight="700">س.ت</text>
      <text x="100" y="104" text-anchor="middle" font-size="12" fill="#1a5c8a" font-weight="700">${cr}</text>
      <text x="100" y="120" text-anchor="middle" font-size="12" fill="#1a5c8a" font-weight="700">الجبيل</text>
      <text font-size="11" fill="#1a5c8a" font-weight="700">
        <textPath href="#ta" startOffset="50%" text-anchor="middle">شركة مرجان الشرقية للمقاولات العامة</textPath>
      </text>
      <text font-size="11" fill="#1a5c8a" font-weight="700">
        <textPath href="#ba" startOffset="50%" text-anchor="middle">المملكة العربية السعودية</textPath>
      </text>
    </svg>
  </div>`;
}

function contractPage(t) {
  const date = fmtDate(t.travel_date);
  const from = esc(placeNameAr(t.route_from));
  const to = esc(placeNameAr(t.route_to));
  const secondParty = esc(t.second_party_name || "");
  const qr = esc(t.qr_url || "https://api.qrserver.com/v1/create-qr-code/?size=130x130&data=MURJAN-AL-SHARQIYA-CR2055010235");
  return `
  <div class="page rtl">
    ${headerHtml(t)}
    <div style="display:flex;gap:16px;align-items:flex-start;margin-bottom:6px;">
      <img src="${qr}" style="width:130px;height:130px;" />
      <div style="flex:1;text-align:center;padding-top:34px;">
        <div style="font-weight:800;font-size:15pt;text-decoration:underline;">عقد نقل على الطرق البرية</div>
      </div>
    </div>
    <div style="margin-bottom:8px;font-size:12pt;"><b>التاريخ:</b>&nbsp;&nbsp;&nbsp;<b>${date}</b></div>
    <div style="font-size:11pt;line-height:1.8;text-align:justify;font-weight:600;">
      <p style="margin:0 0 8px;">تم ابرام هذا العقد بين المتعاقدين بناء على المادة (39) التاسع والثلاثون من الائحة المنظمة لنشاط النقل المتخصص وتأجير وتوجيه الحافلات وبناء على الفقرة(1) من المادة(39) والتي تنص على ان يجب على الناقل ابرام عقد نقل مع الأطراف المحددين في المادة(40)قبل تنفيد عمليات النقل علي الطرق البرية وبما ال يخالف احكام هذه اللائحة ووفقا الألية التي تحددهاهيئة النقل وبناء على ما سبق تم ابرام عقد النقل بين الاطراف الأتيه:</p>
      <table style="width:100%;border-collapse:collapse;margin-bottom:6px;">
        <tr>
          <td style="width:26%;font-weight:800;font-size:12pt;color:${RED};padding:3px 0;">الطرف الأاول:</td>
          <td style="font-weight:800;font-size:12pt;color:${RED};text-align:center;">شركة مرجان الشرقيه للمقاولات العامة س ت/ 2055010225</td>
        </tr>
      </table>
      <table style="width:100%;border-collapse:collapse;margin-bottom:8px;">
        <tr>
          <td class="blue-label" style="width:26%;">الطرف الثاني السيد:</td>
          <td style="border:1.5px solid #333;font-weight:800;font-size:12pt;text-align:center;padding:4px 8px;">${secondParty}</td>
        </tr>
      </table>
      <p style="margin:8px 0;">واتفق الطرفان على أن ينفذ الطرف الأول عملية النقل للطرف الثاني مع مرافقيه وذويهم من الموقع المحدد مسبقا مع الطرف الثاني وتوصلهم الى الجهه المحدده بالعقد</p>
      <table style="width:70%;border-collapse:collapse;margin:8px auto;">
        <tr>
          <td class="blue-label" style="width:28%;">النقل من:</td>
          <td style="border:1.5px solid #333;font-weight:800;font-size:12pt;text-align:center;padding:4px 8px;">${from}</td>
        </tr>
        <tr>
          <td class="blue-label">وصولا الى:</td>
          <td style="border:1.5px solid #333;font-weight:800;font-size:12pt;text-align:center;padding:4px 8px;">${to}</td>
        </tr>
      </table>
      <p style="margin:8px 0;">فى حالة الغاء التعاقد الى سبب شخصى او أسباب أخرى تتعلق فى الحجوزات او األنظمة تكون سياسة الالغاء والاستبدال</p>
      <p style="margin:8px 0;">حسب نظام وزارة التجارة السعودى فى حالة الحجز وتم الالغاء قبل موعد الرحله باكثر من 24 ساعة يتم استرداد المبلغ كامل</p>
      <p style="margin:8px 0;">وفي حالة طلب الطرف الثاني الحجز من خلال الموقع الالكتروني للمؤسسه يعتبر هذا الحجز وموافقته على الشروط والاحكام بالموقع الالكتروني هو موافقة على هذا العقد لتنفيذ عملية النقل المتفق عليها مع الطرف الاول بواسطة حافلات المؤسسة المرخصه والمتوافقه مع الاشتراطات المقررة من هيئة النقل</p>
    </div>
    ${stampHtml(t, "position:absolute;bottom:26mm;left:14mm;")}
    ${footerHtml(t)}
  </div>`;
}

function manifestPage(t) {
  const date = fmtDate(t.travel_date);
  const dest = `${esc(placeNameAr(t.route_from))} - ${esc(placeNameAr(t.route_to))}`;
  const drivers = t.drivers || [];
  const passengers = t.passengers || [];
  const driverNames = drivers.map((d) => esc(d.name)).filter(Boolean).join("<br/>");
  const driverIqamas = drivers.map((d) => esc(d.iqama_no)).filter(Boolean).join("<br/>");

  let rows = "";
  for (let i = 0; i < 13; i++) {
    const p = passengers[i] || {};
    rows += `<tr>
      <td class="c">${esc(p.nationality || "")}</td>
      <td class="c">${esc(p.id_number || "")}</td>
      <td class="c">${esc(p.name || "")}</td>
      <td class="c num">${i === 12 ? ".13" : i + 1}</td>
    </tr>`;
  }

  return `
  <div class="page">
    ${headerHtml(t)}
    <table style="width:100%;border-collapse:collapse;margin-bottom:10px;">
      <tr>
        <td style="font-weight:800;width:120px;padding:3px 0;">DATE:</td>
        <td style="font-weight:800;font-size:12pt;">${date}</td>
      </tr>
      <tr>
        <td class="blue-label" style="border:1px solid #333;">DESTINATION:</td>
        <td style="font-weight:900;font-size:12pt;text-align:center;border:1px solid #333;padding:3px 8px;">${dest}</td>
      </tr>
      <tr>
        <td style="font-weight:800;padding:3px 0;">TIME:</td>
        <td style="font-weight:800;font-size:12pt;">${esc(t.trip_time || "")}</td>
      </tr>
    </table>
    <div style="text-align:center;font-weight:800;font-size:13pt;margin-bottom:6px;direction:rtl;">بيانات الركاب</div>
    <table class="grid" style="margin-bottom:12px;">
      <tr>
        <th>رقم الاقامة<br/>Iqama No</th>
        <th>أسماء السائقين<br/>Drivers Names</th>
        <th>رقم اللوحة<br/>Plat No.</th>
        <th>نوع السيارة<br/>Car Model</th>
      </tr>
      <tr>
        <td class="c">${driverIqamas}</td>
        <td class="c">${driverNames}</td>
        <td class="c">${esc(t.vehicle_plate || "")}</td>
        <td class="c">${esc(t.car_model || "")}</td>
      </tr>
    </table>
    <table class="grid">
      <tr>
        <th style="width:28%;">الجنسية<br/>Nationality</th>
        <th style="width:30%;">رقم الهوية<br/>ID No.</th>
        <th style="width:34%;">اسم الضيف<br/>Guest Name</th>
        <th style="width:8%;">م</th>
      </tr>
      ${rows}
    </table>
    ${stampHtml(t, "position:absolute;bottom:26mm;left:14mm;")}
    ${footerHtml(t)}
  </div>`;
}

const CHECKLIST = [
  {
    titleAr: "أول:فحص مؤشرات لوحة القيادة:",
    titleEn: "FIRST: CHECK THE DASHBOUARD INDID",
    items: [
      { ar: "مؤشر الوقود", en: "FUEL GAUGE" },
      { ar: "مؤشر الحرارة", en: "TEMPERATURE GAUGE" },
      { ar: "مؤشر ضغط الزيت", en: "OIL PRESSURE GAGUE" },
      { ar: "لمبة فحص المحرك", en: "CHECK ENGIN LIGHT" },
      { ar: "لمبة ABC", en: "ABS LIGHT" },
      { ar: "لمبة التحذير", en: "WARNING LIGHT" }
    ]
  },
  {
    titleAr: "ثانيا : الفحص الخارجي:",
    titleEn: "SECOND: EXTERNAL INSPECTION:",
    items: [
      { ar: "الأطارات و ضغط الهواء", en: "TIRES ANDORRA AIR" },
      { ar: "ألنوار ألمامية والخلفية", en: "HEADLIGHTS ANDORRA TAILIGHT" },
      { ar: "الأشارات التحذيرية", en: "WARNING SIGNALS" },
      { ar: "الزجاج و المرايا", en: "GLASS ANDORRA MIRRORS" },
      { ar: "عدم و جود تسريبات", en: "NO LEAKS" }
    ]
  },
  {
    titleAr: "ثالثا: أدوات و متطلبات الأمن و السلامة:",
    titleEn: "THIRD: SAFETY ANDORRA SECURITY TOOLS ANDORRA REQUIREMENTS:",
    items: [
      { ar: "طفاية حريق سارية الصلاحية", en: "VALID FIRE EXTINGUISHER" },
      { ar: "مثلث تحذيري", en: "WARNING TRIANGLE" },
      { ar: "حقيبة اسعافات اولية", en: "FIRST AID KIT" },
      { ar: "مطرقة كسر الزجاج", en: "GLASS BREAKR HAMMER" },
      { ar: "أحزمة الأمان", en: "SAFETY BELTES" }
    ]
  }
];

function inspectionPage(t) {
  const date = fmtDate(t.travel_date);
  const drivers = t.drivers || [];
  const first = drivers[0] || {};
  const driverName = esc(first.name || "");

  let sections = "";
  for (const sec of CHECKLIST) {
    let items = "";
    for (const item of sec.items) {
      items += `<tr>
        <td class="c" style="text-align:right;direction:rtl;">${item.ar} &mdash;${item.en}</td>
        <td class="c">&#9745;</td>
        <td class="c">&#9744;</td>
        <td class="c"></td>
      </tr>`;
    }
    sections += `
    <div style="margin-bottom:9px;">
      <div style="display:flex;justify-content:space-between;margin-bottom:2px;font-weight:800;font-size:9.5pt;">
        <span>${sec.titleEn}</span><span style="direction:rtl;">${sec.titleAr}</span>
      </div>
      <table class="grid small">
        <tr>
          <th style="width:42%;">البند ITEM</th>
          <th style="width:13%;">سليم SOUND</th>
          <th style="width:15%;">غير سليم UNSOUN</th>
          <th style="width:30%;">ملاحظات NOTES</th>
        </tr>
        ${items}
      </table>
    </div>`;
  }

  return `
  <div class="page">
    ${headerHtml(t)}
    <div style="text-align:center;margin-bottom:8px;">
      <div style="font-weight:900;font-size:14pt;direction:rtl;">سجل الفحص اليومى للسيارة</div>
      <div style="font-weight:800;font-size:12pt;">Daily vehicle inspection log</div>
    </div>
    <table class="grid small" style="margin-bottom:12px;">
      <tr>
        <th>وقت الفحص</th><th>التاريخ</th><th>لوحة المركبة</th><th>اسم السائق</th>
      </tr>
      <tr>
        <td class="c"><b>${esc(t.trip_time || "")}</b></td>
        <td class="c"><b>${date}</b></td>
        <td class="c"><b>${esc(t.vehicle_plate || "")}</b></td>
        <td class="c"><b>${driverName}</b></td>
      </tr>
    </table>
    ${sections}
    <div style="direction:rtl;margin-top:10px;font-size:10pt;">
      <div style="font-weight:800;">إقرار:</div>
      <div>أقر أنا السائق اعلاه بأني قمت بفحص الحافلة والتأكد من سلامتها وجاهزيتها قبل التشغيل .</div>
      <table style="width:70%;border-collapse:collapse;margin-top:8px;">
        <tr>
          <td style="font-weight:800;width:110px;padding:3px 0;">إسم السائق:</td>
          <td style="font-weight:800;text-align:center;">${driverName}</td>
        </tr>
        <tr>
          <td style="font-weight:800;padding:3px 0;">ألتوقيع:</td>
          <td style="text-align:center;">.................................................................</td>
        </tr>
      </table>
    </div>
    ${stampHtml(t, "position:absolute;bottom:24mm;left:14mm;")}
    ${footerHtml(t)}
  </div>`;
}

import { placeNameAr } from "./placeNamesAr.ts";

export function buildManifestHtml(trip) {
  const t = trip || {};
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<title>${esc(t.trip_name || "Trip Manifest")}</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap');
* { box-sizing: border-box; }
body { margin:0; background:#e5e7eb; font-family:'Cairo', Arial, sans-serif; color:#111; }
.page {
  width:210mm; min-height:297mm; background:#fff; margin:0 auto 16px;
  padding:8mm 12mm 30mm; position:relative; font-size:10.5pt; line-height:1.5;
}
.rtl { direction:rtl; }
.msc-logo { display:flex; align-items:center; height:56px; flex-shrink:0; direction:ltr; }
.msc-logo .m { font-size:34pt; font-weight:900; color:#8B2E2E; font-family:Arial; line-height:1; letter-spacing:-2px; }
.msc-logo .sc { font-size:34pt; font-weight:900; color:#6b6b6b; font-family:Arial; line-height:1; margin-left:-3px; letter-spacing:-1px; }
.doc-header { margin-bottom:8px; direction:ltr; }
.doc-header-row { display:flex; align-items:center; justify-content:space-between; }
.doc-header-text { text-align:right; flex:1; padding-left:12px; }
.co-ar { font-size:16pt; font-weight:900; color:#8B2E2E; line-height:1.15; }
.co-sub { font-size:8.5pt; color:#777; }
.co-en { font-size:10pt; font-weight:700; color:#1a1a1a; margin-top:2px; }
.co-cr { font-size:8.5pt; color:#777; }
.header-bar { height:3px; background:linear-gradient(to right,#4d4b4c 0%,#c9564c 100%); margin-top:5px; }
.blue-label { background:${BLUE}; color:#fff; font-weight:800; padding:3px 10px; border:1px solid ${BLUE}; }
table.grid { width:100%; border-collapse:collapse; font-size:10pt; }
table.grid th { border:1px solid #555; background:${NAVY}; color:#fff; font-weight:700; text-align:center; padding:4px 6px; }
table.grid td.c { border:1px solid #555; padding:4px 6px; text-align:center; font-weight:700; }
table.grid td.num { background:${NAVY}; color:#fff; font-weight:900; }
table.grid.small { font-size:9pt; }
table.grid.small th, table.grid.small td.c { padding:2.5px 5px; }
.doc-footer {
  position:absolute; bottom:6mm; left:12mm; right:12mm; font-size:7pt;
  text-align:center; color:#333; border-top:1px solid #888; padding-top:3px; direction:ltr;
}
.stamp { opacity:0.9; }
@media print {
  body { background:#fff; }
  .page { margin:0; page-break-after:always; }
  @page { size:A4; margin:0; }
}
</style>
</head>
<body>
${contractPage(t)}
${manifestPage(t)}
${inspectionPage(t)}
</body>
</html>`;
}