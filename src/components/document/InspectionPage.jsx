import React from "react";
import DocumentHeader from "./DocumentHeader";
import { pageStyle, tableStyle, cellStyle, headerCellStyle, LIGHT, PRIMARY } from "./styles";
import { formatTripDate } from "@/lib/dateFormat";
import { INSPECTION_CHECKLIST } from "@/lib/inspectionChecklist";

function Box({ checked }) {
  return (
    <span
      style={{
        display: "inline-block",
        width: "14px",
        height: "14px",
        border: "1px solid #333",
        textAlign: "center",
        lineHeight: "13px",
        fontSize: "12px"
      }}
    >
      {checked ? "✓" : ""}
    </span>
  );
}

export default function InspectionPage({ trip }) {
  const date = formatTripDate(trip.travel_date);
  const drivers = trip.drivers || [];
  const driverNames = drivers.map((d) => d.name).filter(Boolean).join(", ");
  const sections = Object.values(INSPECTION_CHECKLIST);

  return (
    <div className="doc-page" style={pageStyle}>
      <DocumentHeader trip={trip} />
      <div style={{ textAlign: "center", marginBottom: "10px" }}>
        <div style={{ fontWeight: 800, color: PRIMARY }}>
          Daily Vehicle Inspection Log
        </div>
        <div dir="rtl" style={{ fontWeight: 700, color: PRIMARY }}>
          سجل الفحص اليومي للسيارة
        </div>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "6px",
          border: "1px solid #333",
          padding: "8px",
          marginBottom: "12px",
          fontSize: "10pt"
        }}
      >
        <div>
          Inspection Time: <b>{trip.trip_time || ""}</b>
        </div>
        <div>
          Date: <b>{date}</b>
        </div>
        <div>
          Vehicle Plate: <b>{trip.vehicle_plate || ""}</b>
        </div>
        <div>
          Driver Name: <b>{driverNames}</b>
        </div>
      </div>
      {sections.map((sec, si) => (
        <div key={si} style={{ marginBottom: "10px" }}>
          <div
            style={{
              background: LIGHT,
              border: "1px solid #333",
              padding: "4px 8px",
              fontWeight: 700
            }}
          >
            {sec.title}
          </div>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={{ ...headerCellStyle, textAlign: "left" }}>Item</th>
                <th style={{ ...headerCellStyle, width: "70px" }}>Sound</th>
                <th style={{ ...headerCellStyle, width: "80px" }}>Unsound</th>
                <th style={{ ...headerCellStyle, width: "160px" }}>Notes</th>
              </tr>
            </thead>
            <tbody>
              {sec.items.map((it, i) => (
                <tr key={i}>
                  <td style={{ ...cellStyle, textAlign: "left" }}>{it}</td>
                  <td style={{ ...cellStyle, textAlign: "center" }}>
                    <Box checked />
                  </td>
                  <td style={{ ...cellStyle, textAlign: "center" }}>
                    <Box />
                  </td>
                  <td style={cellStyle}></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
      <div style={{ marginTop: "18px", fontSize: "11pt" }}>
        <p>
          I, the undersigned driver, declare that the above vehicle has been
          inspected and is in sound condition for operation.
        </p>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: "20px"
          }}
        >
          <div>
            Driver Name: <b>{driverNames}</b>
          </div>
          <div>Signature: ____________________</div>
        </div>
      </div>
    </div>
  );
}