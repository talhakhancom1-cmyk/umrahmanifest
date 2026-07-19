import React from "react";
import DocumentHeader from "./DocumentHeader";
import PageFooter from "./PageFooter";
import { pageStyle } from "./styles";
import { formatTripDate } from "@/lib/dateFormat";
import { INSPECTION_CHECKLIST } from "@/lib/inspectionChecklist";

function Checkbox({ checked }) {
  return (
    <span style={{
      display: "inline-block", width: "15px", height: "15px",
      border: "1.5px solid #333", textAlign: "center", lineHeight: "14px",
      fontSize: "12px", verticalAlign: "middle"
    }}>
      {checked ? "☑" : "☐"}
    </span>
  );
}

export default function InspectionPage({ trip }) {
  const date = formatTripDate(trip.travel_date);
  const drivers = trip.drivers || [];
  // Only first driver shown on inspection page (as per template)
  const firstDriver = drivers[0] || {};
  const driverName = firstDriver.name || "";

  const thStyle = {
    border: "1px solid #555", background: "#222", color: "#fff",
    fontWeight: 700, textAlign: "center", padding: "4px 6px", fontSize: "9.5pt"
  };
  const tdStyle = {
    border: "1px solid #555", padding: "4px 6px",
    textAlign: "center", fontSize: "9.5pt"
  };
  const tdItemStyle = {
    border: "1px solid #555", padding: "4px 8px",
    textAlign: "right", direction: "rtl", fontSize: "9.5pt"
  };

  return (
    <div className="doc-page" style={{ ...pageStyle, paddingBottom: "28mm" }}>
      <DocumentHeader trip={trip} />

      {/* Page title */}
      <div style={{ textAlign: "center", marginBottom: "8px" }}>
        <div style={{ fontWeight: 900, fontSize: "15pt", direction: "rtl" }}>
          سجل الفحص اليومى للسيارة
        </div>
        <div style={{ fontWeight: 800, fontSize: "13pt" }}>
          Daily vehicle inspection log
        </div>
      </div>

      {/* Header info table */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "14px" }}>
        <thead>
          <tr>
            <th style={{ ...thStyle, direction: "rtl" }}>اسم السائق</th>
            <th style={{ ...thStyle, direction: "rtl" }}>لوحة المركبة</th>
            <th style={{ ...thStyle, direction: "rtl" }}>التاريخ</th>
            <th style={{ ...thStyle, direction: "rtl" }}>وقت الفحص</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={{ ...tdStyle, fontWeight: 700 }}>{driverName}</td>
            <td style={{ ...tdStyle, fontWeight: 700 }}>{trip.vehicle_plate || ""}</td>
            <td style={{ ...tdStyle, fontWeight: 700 }}>{date}</td>
            <td style={{ ...tdStyle, fontWeight: 700 }}>{trip.trip_time || ""}</td>
          </tr>
        </tbody>
      </table>

      {/* Checklist sections */}
      {INSPECTION_CHECKLIST.map((sec, si) => (
        <div key={si} style={{ marginBottom: "10px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
            <div style={{ fontWeight: 800, fontSize: "10pt" }}>{sec.titleEn}</div>
            <div style={{ fontWeight: 800, fontSize: "10pt", direction: "rtl" }}>{sec.titleAr}</div>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ ...thStyle, width: "40%" }}>البند ITEM</th>
                <th style={{ ...thStyle, width: "13%" }}>سليم SOUND</th>
                <th style={{ ...thStyle, width: "15%" }}>غير سليم UNSOUN</th>
                <th style={{ ...thStyle, width: "32%" }}>ملاحظات NOTES</th>
              </tr>
            </thead>
            <tbody>
              {sec.items.map((item, ii) => (
                <tr key={ii}>
                  <td style={tdItemStyle}>
                    <span style={{ direction: "rtl" }}>{item.ar}</span>
                    <span style={{ color: "#555", marginRight: "4px", direction: "ltr" }}> —{item.en}</span>
                  </td>
                  <td style={tdStyle}><Checkbox checked={true} /></td>
                  <td style={tdStyle}><Checkbox checked={false} /></td>
                  <td style={tdStyle}></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      {/* Declaration */}
      <div style={{ marginTop: "12px", direction: "rtl" }}>
        <div style={{ fontWeight: 700, fontSize: "11pt", marginBottom: "6px" }}>إقرار:</div>
        <p style={{ margin: "0 0 10px", fontSize: "10.5pt" }}>
          أقر أنا السائق أعلاه بأني قمت بفحص الحافلة والتأكد من سالمتها وجاهزيتها قبل التشغيل .
        </p>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: "8px" }}>
          <div style={{ direction: "ltr" }}>التوقيع: ...................................................................</div>
          <div>إسم السائق: <b>{driverName}</b></div>
        </div>
      </div>

      {/* Stamp */}
      <div style={{ position: "absolute", bottom: "28mm", left: "12mm" }}>
        {trip.stamp_url ? (
          <img src={trip.stamp_url} style={{ width: "80px", height: "80px", objectFit: "contain" }} />
        ) : (
          <div style={{
            width: "75px", height: "75px", border: "1px dashed #999",
            borderRadius: "50%", display: "flex", alignItems: "center",
            justifyContent: "center", fontSize: "8pt", color: "#999"
          }}>Stamp</div>
        )}
      </div>

      <PageFooter />
    </div>
  );
}