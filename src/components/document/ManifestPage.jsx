import React from "react";
import DocumentHeader from "./DocumentHeader";
import { pageStyle, tableStyle, cellStyle, headerCellStyle } from "./styles";
import { formatTripDate } from "@/lib/dateFormat";

export default function ManifestPage({ trip }) {
  const date = formatTripDate(trip.travel_date);
  const dest = `${(trip.route_from || "").toUpperCase()} TO ${(
    trip.route_to || ""
  ).toUpperCase()}`;
  const drivers = trip.drivers || [];
  const passengers = trip.passengers || [];
  const rowCount = Math.max(13, passengers.length);
  const rows = Array.from({ length: rowCount }, (_, i) =>
    passengers[i] || { name: "", id_number: "", nationality: "" }
  );
  const driverNames = drivers.map((d) => d.name).filter(Boolean).join("، ");
  const driverIqamas = drivers.map((d) => d.iqama_no).filter(Boolean).join("، ");

  return (
    <div className="doc-page" style={pageStyle}>
      <DocumentHeader trip={trip} />
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "10px",
          fontWeight: 700
        }}
      >
        <div>DATE: {date}</div>
        <div>DESTINATION: {dest}</div>
        <div>TIME: {trip.trip_time || ""}</div>
      </div>
      <div
        style={{
          border: "1px solid #333",
          padding: "8px",
          marginBottom: "12px",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "6px",
          fontSize: "10pt"
        }}
      >
        <div>
          Iqama No: <b>{driverIqamas}</b>
        </div>
        <div>
          Plate No.: <b>{trip.vehicle_plate || ""}</b>
        </div>
        <div>
          Drivers Names: <b>{driverNames}</b>
        </div>
        <div>
          Car Model: <b>{trip.car_model || ""}</b>
        </div>
      </div>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={{ ...headerCellStyle, width: "8%" }}>#</th>
            <th style={{ ...headerCellStyle, width: "22%" }}>Nationality</th>
            <th style={{ ...headerCellStyle, width: "28%" }}>ID No.</th>
            <th style={{ ...headerCellStyle, width: "42%" }}>Guest Name</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p, i) => (
            <tr key={i} style={{ height: "22px" }}>
              <td style={{ ...cellStyle, textAlign: "center" }}>{i + 1}</td>
              <td style={cellStyle}>{p.nationality || ""}</td>
              <td style={cellStyle}>{p.id_number || ""}</td>
              <td style={cellStyle}>{p.name || ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "24px" }}>
        {trip.stamp_url ? (
          <img src={trip.stamp_url} style={{ height: "80px" }} />
        ) : (
          <div
            style={{
              border: "1px dashed #999",
              width: "90px",
              height: "80px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#999",
              fontSize: "9pt"
            }}
          >
            Stamp
          </div>
        )}
      </div>
    </div>
  );
}