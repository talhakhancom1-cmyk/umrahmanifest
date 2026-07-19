import { jsPDF } from "jspdf";

async function loadImage(url) {
  if (!url) return null;
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const data = await new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = reject;
      r.readAsDataURL(blob);
    });
    const fmt = blob.type.includes("png") ? "PNG" : "JPEG";
    return { data, fmt };
  } catch {
    return null;
  }
}

export async function generateTripPdf(trip) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const margin = 10;
  const pageW = 210;
  const contentW = pageW - margin * 2;
  let y = margin;

  const logo = await loadImage(trip.logo_url);
  const headerX = margin + (logo ? 26 : 0);
  if (logo) {
    try { doc.addImage(logo.data, logo.fmt, margin, y, 22, 22); } catch {}
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text(trip.company_name || "Company Name", headerX, y + 7);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Passenger Transport Manifest", pageW - margin, y + 7, { align: "right" });
  y += 24;

  const routeLabel = trip.route === "Madina_to_Makkah" ? "Madinah -> Makkah" : "Makkah -> Madinah";
  const destination = trip.route === "Madina_to_Makkah" ? "Makkah" : "Madinah";
  doc.setDrawColor(220);
  doc.setFillColor(245, 245, 245);
  doc.rect(margin, y, contentW, 20, "FD");
  doc.setFontSize(9);
  doc.text(
    [
      `Trip: ${trip.trip_name || ""}`,
      `Route: ${routeLabel}`,
      `Date: ${trip.travel_date || ""}`,
      `Driver: ${trip.driver_name || ""}`,
      `Vehicle: ${trip.vehicle_plate || ""}`
    ],
    margin + 3,
    y + 5
  );
  y += 26;

  const cols = [
    { t: "No.", w: 12 },
    { t: "Name", w: 60 },
    { t: "ID No.", w: 40 },
    { t: "Nationality", w: 34 },
    { t: "Destination", w: 24 },
    { t: "Date", w: 20 }
  ];
  const rowH = 9;
  const drawHeader = () => {
    doc.setFillColor(230, 230, 230);
    doc.rect(margin, y, contentW, rowH, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    let x = margin;
    cols.forEach((c) => {
      doc.text(c.t, x + 2, y + 6);
      x += c.w;
    });
    doc.setDrawColor(180);
    doc.rect(margin, y, contentW, rowH);
    y += rowH;
  };
  drawHeader();

  const passengers = trip.passengers || [];
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  passengers.forEach((p, i) => {
    if (y > 268) {
      doc.addPage();
      y = margin;
      drawHeader();
    }
    let x = margin;
    const cells = [
      String(i + 1),
      p.name || "",
      p.id_number || "",
      p.nationality || "",
      destination,
      trip.travel_date || ""
    ];
    cells.forEach((val, ci) => {
      doc.text(String(val).slice(0, 40), x + 2, y + 6);
      x += cols[ci].w;
    });
    doc.setDrawColor(200);
    doc.rect(margin, y, contentW, rowH);
    y += rowH;
  });

  y = Math.max(y + 12, 248);
  const stamp = await loadImage(trip.stamp_url);
  if (stamp) {
    try { doc.addImage(stamp.data, stamp.fmt, pageW - margin - 40, y, 40, 40); } catch {}
  } else {
    doc.setDrawColor(150);
    doc.rect(pageW - margin - 40, y, 40, 40);
    doc.text("Stamp", pageW - margin - 28, y + 22);
  }
  const qr = await loadImage(trip.qr_url);
  if (qr) {
    try { doc.addImage(qr.data, qr.fmt, margin, y, 35, 35); } catch {}
  } else {
    doc.setDrawColor(150);
    doc.rect(margin, y, 35, 35);
    doc.text("QR", margin + 13, y + 19);
  }
  doc.text("Driver Signature: ____________________", margin + 42, y + 30);

  doc.save(`${(trip.trip_name || "trip").replace(/\s+/g, "_")}.pdf`);
}