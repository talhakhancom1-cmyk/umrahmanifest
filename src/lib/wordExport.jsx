import React from "react";
import { renderToString } from "react-dom/server";
import ManifestDocument from "@/components/document/ManifestDocument";

export function downloadWord(trip) {
  const inner = renderToString(<ManifestDocument trip={trip} />);
  const html =
    `<!DOCTYPE html><html xmlns:o='urn:schemas-microsoft-com:office:office' ` +
    `xmlns:w='urn:schemas-microsoft-com:office:word' ` +
    `xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'>` +
    `<title>${trip.trip_name || "trip"}</title>` +
    `<style>@page Section1 { size: A4; margin: 12mm; } ` +
    `div.Section1 { page: Section1; } ` +
    `.doc-page { page-break-after: always; } ` +
    `body { font-family: 'Cairo', Arial, sans-serif; }</style></head>` +
    `<body>${inner}</body></html>`;
  const blob = new Blob(["\ufeff", html], { type: "application/msword" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${(trip.trip_name || "trip").replace(/\s+/g, "_")}.doc`;
  a.click();
  URL.revokeObjectURL(url);
}