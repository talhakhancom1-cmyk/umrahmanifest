import { esc } from "./mscTemplate.ts";

export const MEHDULLAH_TEMPLATE_URL =
  "https://media.base44.com/files/public/6a5cef68337f5303ffc014f5/c3dd01e3f_MEHDULLAH.html";

// Mehdullah's pdf2htmlEX template renders every label through embedded fonts
// with private-use glyph encoding, so field positions/labels can't be read
// programmatically. We render the template as-is (print-ready) and do not
// inject trip data — same limitation as other image-based templates (e.g. Umar).
export function buildFromMehdullahTemplate(templateHtml: string, trip: any): string {
  let html = templateHtml;
  const extraCss = `
<style>
#sidebar{display:none!important}
#page-container{left:0!important}
.loading-indicator{display:none!important}
@media screen{.pc{display:block!important;opacity:1!important}}
@media print{@page{size:A4;margin:0}html,body{margin:0}.pf{page-break-after:always}}
</style>`;
  html = html.replace("</head>", extraCss + "\n</head>");
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${esc((trip && trip.trip_name) || "Mehdullah Manifest")}</title>`);
  return html;
}