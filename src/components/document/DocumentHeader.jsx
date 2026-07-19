import React from "react";

export default function DocumentHeader({ trip }) {
  const t = trip || {};
  const nameAr = t.company_name_ar || "شركة مرجان الشرقية للمقاولات العامة";
  const nameEn = t.company_name || "MURJAN AL-SHARQIYA General Contracting Co.";
  const cr = t.cr_number || "2055010235";

  return (
    <div style={{ marginBottom: "10px", direction: "ltr" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        {/* MSC logo lockup */}
        <div style={{ display: "flex", alignItems: "center", height: "54px", flexShrink: 0 }}>
          <span style={{
            fontSize: "34pt", fontWeight: 900, color: "#8B2E2E",
            fontFamily: "Arial, sans-serif", lineHeight: 1, letterSpacing: "-2px"
          }}>M</span>
          <span style={{
            fontSize: "34pt", fontWeight: 900, color: "#6b6b6b",
            fontFamily: "Arial, sans-serif", lineHeight: 1, marginLeft: "-3px", letterSpacing: "-1px"
          }}>SC</span>
        </div>
        {/* Company text */}
        <div style={{ textAlign: "right", flex: 1, paddingLeft: "12px" }}>
          <div style={{
            fontFamily: "'Cairo', Arial, sans-serif",
            fontSize: "17pt", fontWeight: 900, color: "#8B2E2E", lineHeight: 1.15
          }}>{nameAr}</div>
          <div style={{ fontSize: "8.5pt", color: "#777", marginTop: "1px", fontFamily: "'Cairo', Arial, sans-serif" }}>
            ذات مسؤولية محدودة – س.ت {cr}
          </div>
          <div style={{ fontSize: "10pt", fontWeight: 700, color: "#1a1a1a", marginTop: "2px" }}>
            {nameEn}
          </div>
          <div style={{ fontSize: "8.5pt", color: "#777" }}>
            Limited Responsibility - C.R. {cr}
          </div>
        </div>
      </div>
      {/* Gradient divider bar */}
      <div style={{
        height: "3px",
        background: "linear-gradient(to right, #4d4b4c 0%, #c9564c 100%)",
        marginTop: "5px",
        borderRadius: "1px"
      }} />
    </div>
  );
}