import React from "react";
import DocumentHeader from "./DocumentHeader";
import PageFooter from "./PageFooter";
import { pageStyle } from "./styles";
import { formatTripDate } from "@/lib/dateFormat";

export default function ManifestPage({ trip }) {
  const date = formatTripDate(trip.travel_date);
  const dest = `${(trip.route_from || "").toUpperCase()} TO ${(trip.route_to || "").toUpperCase()}`;
  const drivers = trip.drivers || [];
  const passengers = trip.passengers || [];

  // Always show 13 rows
  const rows = Array.from({ length: 13 }, (_, i) =>
    passengers[i] || { name: "", id_number: "", nationality: "" }
  );

  const driverNames = drivers.map((d) => d.name).filter(Boolean).join("\n");
  const driverIqamas = drivers.map((d) => d.iqama_no).filter(Boolean).join("\n");

  const tdC = {
    border: "1px solid #555", padding: "4px 6px", textAlign: "center",
    fontWeight: 700, fontSize: "10pt"
  };
  const thDark = {
    border: "1px solid #555", background: "#222", color: "#fff",
    fontWeight: 700, textAlign: "center", padding: "5px 6px", fontSize: "10pt"
  };
  const thDarkAr = {
    ...thDark,
    direction: "rtl"
  };

  const rowColors = ["#f5f5f5", "#fff"];

  return (
    <div className="doc-page" style={{ ...pageStyle, paddingBottom: "28mm" }}>
      <DocumentHeader trip={trip} />

      {/* DATE / DESTINATION / TIME */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "10px" }}>
        <tbody>
          <tr>
            <td style={{ fontWeight: 700, width: "80px", padding: "3px 0" }}>DATE:</td>
            <td style={{ fontWeight: 700, fontSize: "12pt" }}>{date}</td>
          </tr>
          <tr>
            <td style={{
              fontWeight: 700, background: "#222", color: "#fff",
              border: "1px solid #333", padding: "4px 8px"
            }}>DESTINATION:</td>
            <td style={{
              fontWeight: 900, fontSize: "13pt", textAlign: "center",
              border: "1px solid #333", padding: "4px 8px", letterSpacing: "1px"
            }}>{dest}</td>
          </tr>
          <tr>
            <td style={{ fontWeight: 700, padding: "3px 0" }}>TIME:</td>
            <td style={{ fontWeight: 700, fontSize: "12pt" }}>{trip.trip_time || ""}</td>
          </tr>
        </tbody>
      </table>

      {/* بيانات الركاب */}
      <div style={{ textAlign: "center", fontWeight: 800, fontSize: "13pt", marginBottom: "6px", direction: "rtl" }}>
        بيانات الركاب
      </div>

      {/* Driver info table */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "10px" }}>
        <thead>
          <tr>
            <th style={thDarkAr}>رقم الاقامة<br /><span style={{ direction: "ltr", display: "inline-block" }}>Iqama No</span></th>
            <th style={thDarkAr}>أسماء السائقين<br /><span style={{ direction: "ltr", display: "inline-block" }}>Drivers Names</span></th>
            <th style={thDarkAr}>رقم اللوحة<br /><span style={{ direction: "ltr", display: "inline-block" }}>Plat No.</span></th>
            <th style={thDarkAr}>نوع السيارة<br /><span style={{ direction: "ltr", display: "inline-block" }}>Car Model</span></th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={{ ...tdC, whiteSpace: "pre-line" }}>{driverIqamas || ""}</td>
            <td style={{ ...tdC, whiteSpace: "pre-line" }}>{driverNames || ""}</td>
            <td style={tdC}>{trip.vehicle_plate || ""}</td>
            <td style={tdC}>{trip.car_model || ""}</td>
          </tr>
        </tbody>
      </table>

      {/* Passenger table */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "14px" }}>
        <thead>
          <tr>
            <th style={{ ...thDarkAr, width: "28%" }}>
              <span style={{ direction: "rtl" }}>الجنسية</span>
              <br /><span style={{ direction: "ltr", display: "inline-block" }}>Nationality</span>
            </th>
            <th style={{ ...thDarkAr, width: "30%" }}>
              <span style={{ direction: "rtl" }}>رقم الهوية</span>
              <br /><span style={{ direction: "ltr", display: "inline-block" }}>ID No.</span>
            </th>
            <th style={{ ...thDarkAr, width: "32%" }}>
              <span style={{ direction: "rtl" }}>اسم الضيف</span>
              <br /><span style={{ direction: "ltr", display: "inline-block" }}>Guest Name</span>
            </th>
            <th style={{ ...thDark, width: "10%" }}>م</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p, i) => (
            <tr key={i} style={{ background: rowColors[i % 2] }}>
              <td style={tdC}>{p.nationality || ""}</td>
              <td style={tdC}>{p.id_number || ""}</td>
              <td style={tdC}>{p.name || ""}</td>
              <td style={{ ...tdC, background: "#222", color: "#fff", fontWeight: 900 }}>
                {i === 12 ? ".13" : i + 1}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Stamp bottom left */}
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