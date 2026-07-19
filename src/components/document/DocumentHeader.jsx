import React from "react";

export default function DocumentHeader({ trip }) {
  const nameAr = trip.company_name_ar || "شركة مرجان الشرقية للمقاولات العامة";
  const nameEn = trip.company_name || "MURJAN AL-SHARQIYA General Contracting Co.";
  const cr = trip.cr_number || "2055010235";

  return (
    <div style={{ marginBottom: "10px" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        {trip.logo_url ? (
          <img src={trip.logo_url} style={{ height: "70px", objectFit: "contain" }} />
        ) : (
          <div style={{
            width: "70px", height: "70px", background: "#cc0000",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff", fontWeight: 900, fontSize: "22pt", fontFamily: "Arial"
          }}>MSC</div>
        )}
        <div style={{ textAlign: "right", flex: 1, paddingRight: "12px" }}>
          <div style={{
            fontFamily: "'Cairo', Arial, sans-serif",
            fontSize: "20pt", fontWeight: 900, color: "#cc0000", lineHeight: 1.1
          }}>{nameAr}</div>
          {trip.cr_number !== undefined && (
            <div style={{ fontSize: "8.5pt", color: "#333", marginTop: "2px" }}>
              ذات مسـئولية محـدودة – س.ت {cr}
            </div>
          )}
          <div style={{ fontSize: "10.5pt", fontWeight: 700, color: "#1a1a1a" }}>
            {nameEn}
          </div>
          <div style={{ fontSize: "9pt", color: "#333" }}>
            Limited Responsibility - C.R. {cr}
          </div>
        </div>
      </div>
      <div style={{ borderBottom: "2.5px solid #cc0000", marginTop: "6px" }} />
    </div>
  );
}