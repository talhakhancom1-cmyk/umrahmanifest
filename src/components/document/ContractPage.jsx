import React from "react";
import DocumentHeader from "./DocumentHeader";
import { pageStyle, PRIMARY } from "./styles";
import { formatTripDate } from "@/lib/dateFormat";

export default function ContractPage({ trip }) {
  const date = formatTripDate(trip.travel_date);
  const from = (trip.route_from || "").toUpperCase();
  const to = (trip.route_to || "").toUpperCase();
  return (
    <div className="doc-page" style={{ ...pageStyle, direction: "rtl" }}>
      <DocumentHeader trip={trip} />
      <div style={{ textAlign: "center", marginBottom: "12px" }}>
        <div style={{ fontSize: "16pt", fontWeight: 800, color: PRIMARY }}>
          عقد نقل حجاج ومعتمرين
        </div>
        <div style={{ fontSize: "11pt", color: "#444" }}>
          Passenger Transport Contract
        </div>
      </div>
      <div style={{ fontSize: "12pt", lineHeight: 2 }}>
        <p>بسم الله الرحمن الرحيم</p>
        <p>التاريخ: <b>{date}</b></p>
        <p>
          الطرف الأول: شركة مرجان الشرقية للمقاولات العامة (MSC)، سجل تجاري رقم
          2055010235، الجبيل، المملكة العربية السعودية.
        </p>
        <p>
          الطرف الثاني: <b>{trip.second_party_name || "..........................."}</b>
        </p>
        <p>
          تم الاتفاق بين الطرفين على نقل الركاب من <b>{from}</b> إلى <b>{to}</b>{" "}
          وفق البنود التالية:
        </p>
        <ol style={{ paddingRight: "18px" }}>
          <li>تلتزم الشركة بتوفير وسيلة نقل صالحة وسائق مؤهل لتنفيذ الرحلة.</li>
          <li>
            يلتزم الطرف الثاني بتقديم بيانات الركاب (الاسم، رقم الهوية، الجنسية).
          </li>
          <li>
            مسار الرحلة: من {from} إلى {to}، بتاريخ {date}.
          </li>
          <li>تسري أحكام هذا العقد اعتباراً من تاريخ التوقيع.</li>
        </ol>
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: "50px"
        }}
      >
        <div>الطرف الأول (الشركة): ____________________</div>
        <div>الطرف الثاني: ____________________</div>
      </div>
      {trip.stamp_url && (
        <img
          src={trip.stamp_url}
          style={{
            position: "absolute",
            left: "14mm",
            bottom: "22mm",
            height: "72px"
          }}
        />
      )}
    </div>
  );
}