import React from "react";
import { PRIMARY } from "./styles";

export default function DocumentHeader({ trip }) {
  const company =
    trip.company_name || "MURJAN AL-SHARQIYA GENERAL CONTRACTING CO.";
  const companyAr =
    trip.company_name_ar || "شركة مرجان الشرقية للمقاولات العامة";
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        borderBottom: `2px solid ${PRIMARY}`,
        paddingBottom: "8px",
        marginBottom: "14px"
      }}
    >
      <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
        {trip.logo_url && (
          <img
            src={trip.logo_url}
            style={{ height: "52px", objectFit: "contain" }}
          />
        )}
        <div>
          <div style={{ fontWeight: 800, fontSize: "13pt", color: PRIMARY }}>
            {company}
          </div>
          <div
            dir="rtl"
            style={{ fontWeight: 700, fontSize: "12pt", color: PRIMARY }}
          >
            {companyAr}
          </div>
          <div style={{ fontSize: "9pt", color: "#444" }}>
            C.R. 2055010235 · Al Jubail, Saudi Arabia
          </div>
        </div>
      </div>
      {trip.qr_url && (
        <img src={trip.qr_url} style={{ height: "52px" }} />
      )}
    </div>
  );
}