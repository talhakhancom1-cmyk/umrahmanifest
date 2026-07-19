import React from "react";

// The exact MSC header from the template
export default function DocumentHeader({ trip }) {
  return (
    <div style={{ marginBottom: "10px" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        {/* Logo left */}
        {trip.logo_url ? (
          <img src={trip.logo_url} style={{ height: "70px", objectFit: "contain" }} />
        ) : (
          <div style={{
            width: "70px", height: "70px", background: "#cc0000",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff", fontWeight: 900, fontSize: "22pt", fontFamily: "Arial"
          }}>MSC</div>
        )}
        {/* Company name right - Arabic then English */}
        <div style={{ textAlign: "right", flex: 1, paddingRight: "12px" }}>
          <div style={{
            fontFamily: "'Cairo', Arial, sans-serif",
            fontSize: "20pt", fontWeight: 900, color: "#cc0000", lineHeight: 1.1
          }}>شركة مرجان الشرقية للمقاولات العامة</div>
          <div style={{ fontSize: "8.5pt", color: "#333", marginTop: "2px" }}>
            ذات مسـئولية محـدودة – س.ت ٢٠٥٥٠١٠٢٣٥
          </div>
          <div style={{ fontSize: "10.5pt", fontWeight: 700, color: "#1a1a1a" }}>
            MURJAN AL-SHARQIYA General Contracting Co.
          </div>
          <div style={{ fontSize: "9pt", color: "#333" }}>
            Limited Responsibility - C.R. 2055010235
          </div>
        </div>
      </div>
      <div style={{ borderBottom: "2.5px solid #cc0000", marginTop: "6px" }} />
    </div>
  );
}