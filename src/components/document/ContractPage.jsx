import React from "react";
import DocumentHeader from "./DocumentHeader";
import PageFooter from "./PageFooter";
import CompanyStamp from "./CompanyStamp";
import { pageStyle } from "./styles";
import { formatTripDate } from "@/lib/dateFormat";

export default function ContractPage({ trip }) {
  const date = formatTripDate(trip.travel_date);
  const from = (trip.route_from || "").toUpperCase();
  const to = (trip.route_to || "").toUpperCase();
  const secondParty = trip.second_party_name || "";

  return (
    <div className="doc-page" style={{ ...pageStyle, direction: "rtl", paddingBottom: "28mm" }}>
      <DocumentHeader trip={trip} />

      {/* QR code top-left (visually right in RTL) */}
      <div style={{ display: "flex", gap: "16px", marginBottom: "10px", alignItems: "flex-start" }}>
        <div style={{ minWidth: "130px" }}>
          <img
            src={trip.qr_url || "https://api.qrserver.com/v1/create-qr-code/?size=130x130&data=MURJAN-AL-SHARQIYA-CR2055010235&color=000000&bgcolor=FFFFFF&margin=0&qzone=0"}
            style={{ width: "130px", height: "130px" }}
            alt="QR Code"
          />
        </div>
        <div style={{ flex: 1, textAlign: "center", paddingTop: "8px" }}>
          <div style={{ fontWeight: 800, fontSize: "15pt", textDecoration: "underline" }}>
            عقد نقل على الطرق البرية
          </div>
        </div>
      </div>

      {/* Date */}
      <div style={{ marginBottom: "10px", fontSize: "12pt" }}>
        <b>التاريخ:</b>&nbsp;&nbsp;<b style={{ fontSize: "13pt" }}>{date}</b>
      </div>

      {/* Body text */}
      <div style={{ fontSize: "11pt", lineHeight: 1.9, textAlign: "justify" }}>
        <p style={{ margin: "0 0 8px" }}>
          تم ابرام هذا العقد بين المتعاقدين بناء على المادة (39) التاسع والثلاثون من الائحة المنظمة لنشاط النقل
          المتخصص وتأجير وتوجيه الحافلات وبناء على الفقرة(1) من المادة(39) والتي تنص على ان يجب على الناقل ابرام
          عقد نقل مع الأطراف المحددين في المادة(40) قبل تنفيذ عمليات النقل على الطرق البرية وبما ال يخالف احكام
          هذه اللائحة ووفقا الألية التي تحددها هيئة النقل وبناء على ما سبق تم ابرام عقد النقل بين الاطراف الآتيه:
        </p>

        {/* Party 1 */}
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "8px" }}>
          <tbody>
            <tr>
              <td style={{ width: "30%", fontWeight: 700, fontSize: "12pt", color: "#cc0000", padding: "4px 0" }}>الطرف الأاول:</td>
              <td style={{ fontWeight: 700, fontSize: "12pt", textAlign: "center" }}>
                شركة مرجان الشرقيه للمقاولات العامة س ت/ 2055010225
              </td>
            </tr>
            <tr>
              <td style={{ fontWeight: 700, padding: "4px 0" }}>الطرف الثاني السيد:</td>
              <td style={{
                border: "1.5px solid #333", fontWeight: 700, fontSize: "12pt",
                textAlign: "center", padding: "4px 8px", background: "#f5f5f5"
              }}>
                {secondParty}
              </td>
            </tr>
          </tbody>
        </table>

        <p style={{ margin: "8px 0" }}>
          واتفق الطرفان على أن ينفذ الطرف الأول عملية النقل للطرف الثاني مع مرافقيه وذويهم من الموقع المحدد مسبقا
          مع الطرف الثاني المحدده بالعقد
        </p>

        {/* Route table */}
        <table style={{ width: "60%", borderCollapse: "collapse", margin: "8px auto" }}>
          <tbody>
            <tr>
              <td style={{ border: "1.5px solid #333", padding: "5px 10px", fontWeight: 700, background: "#f5f5f5", width: "35%" }}>النقل من:</td>
              <td style={{ border: "1.5px solid #333", padding: "5px 10px", fontWeight: 700, textAlign: "center", fontSize: "13pt" }}>{from}</td>
            </tr>
            <tr>
              <td style={{ border: "1.5px solid #333", padding: "5px 10px", fontWeight: 700, background: "#f5f5f5" }}>وصولا الى:</td>
              <td style={{ border: "1.5px solid #333", padding: "5px 10px", fontWeight: 700, textAlign: "center", fontSize: "13pt" }}>{to}</td>
            </tr>
          </tbody>
        </table>

        <p style={{ margin: "8px 0" }}>
          في حالة الغاء التعاقد الى سبب شخصي او أسباب أخرى تتعلق في الحجوزات او الأنظمة تكون سياسة الالغاء
          والاستبدال
        </p>
        <p style={{ margin: "8px 0" }}>
          حسب نظام وزارة التجارة السعودى في حالة الحجز وتم الالغاء قبل موعد الرحله باكثر من 24 ساعة يتم استرداد
          المبلغ كامل
        </p>
        <p style={{ margin: "8px 0" }}>
          وفي حالة طلب الطرف الثاني الحجز من خلال الموقع الالكتروني للمؤسسسه يعتبر هذا الحجز وموافقته على
          الشروط والاحكام بالموقع الالكتروني هو موافقة على هذا العقد لتنفيذ عملية النقل المتفق عليها مع الطرف الاول
          بواسطة حافلات المؤسسة المرخصه والمتوافقه مع الاشتراطات المقررة من هيئة النقل
        </p>
      </div>

      {/* Company stamp - bottom left near signature */}
      <div style={{ position: "absolute", bottom: "26mm", left: "12mm" }}>
        {trip.stamp_url ? (
          <img src={trip.stamp_url} style={{ width: "110px", height: "110px", objectFit: "contain" }} />
        ) : (
          <CompanyStamp size={110} />
        )}
      </div>

      <PageFooter trip={trip} />
    </div>
  );
}