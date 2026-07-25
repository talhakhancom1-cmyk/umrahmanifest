// Builds the trip document from the original MSC pdf2htmlEX template.
// The template keeps the exact fonts, borders, stamps, QR and Arabic layout;
// dynamic values are swapped directly inside the template's text layer, so
// positioning and typography match the source PDF exactly.

export const MSC_TEMPLATE_URL =
  "https://media.base44.com/files/public/6a5cef68337f5303ffc014f5/6cdbbe766_ZAHIRGUL2759SXA1.html";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function fmtDate(d) {
  if (!d) return "";
  const date = new Date(d);
  if (isNaN(date.getTime())) return d;
  return `${String(date.getDate()).padStart(2, "0")}-${MONTHS[date.getMonth()]}-${String(date.getFullYear()).slice(-2)}`;
}

export function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Rewrites the inner content of pdf2htmlEX text divs whose plain text matches a rule.
// Rules may return a string, or {text, center: true} to re-center the value inside
// its table cell (the text layer uses transform:scale(0.375), so 100%/0.375 ≈ 266.667%).
function replaceTDivs(pageHtml, rules) {
  return pageHtml.replace(/(<div class="t [^"]+">)([\s\S]*?)(<\/div>)/g, (m, open, inner, close) => {
    const plain = inner.replace(/<[^>]+>/g, "").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
    for (const rule of rules) {
      let out = rule(plain);
      if (out === null || out === undefined) continue;
      if (typeof out === "object") {
        const tag = out.center
          ? open.replace(/>$/, ' style="left:0;width:266.667%;text-align:center">')
          : open;
        return tag + out.text + close;
      }
      return open + out + close;
    }
    return m;
  });
}

function centered(text) {
  return { text, center: true };
}

// Passenger table row bottoms on page 2 (px, measured from the template's cell containers)
const ROW_Y = [666.1, 629.0, 595.2, 554.7, 513.8, 471.1, 428.3, 387.4, 344.8, 302.1, 259.4, 216.8, 174.1];
// Column boxes (px): [left, width]
const COL_NAT = [47.5, 253];
const COL_ID = [302.2, 175.2];
const COL_NAME = [477.8, 352.1];

// Sample values baked into the source template, mapped to rows 1..7
const SAMPLE_ID = ["2252121658", "2525603193", "2457714638", "AD650815", "AD650803", "AD650813", "AD650819"];
const SAMPLE_NAME = ["M GORJON", "M SAJIN", "KAZI", "HAMID", "FEROZ", "FATIMA", "AMBARAK"];

function addedCell(col, y, text) {
  return `<div style="position:absolute;left:${col[0]}px;bottom:${y + 9}px;width:${col[1]}px;text-align:center;` +
    `font-family:Arial,Helvetica,sans-serif;font-weight:700;font-size:16px;color:#000;z-index:9;">${text}</div>`;
}

// Extracts the bottom (px) of manifest rows 8..13 from the template's own
// row-number cells, so added rows line up exactly with the printed table.
function extractRowBottoms(pageHtml, head) {
  const bottoms = {};
  pageHtml.replace(/<div class="(c [^"]+)"><div class="t [^"]+">([\s\S]*?)<\/div>/g, (m, cCls, inner) => {
    const plain = inner.replace(/<[^>]+>/g, "").replace(/\u00a0/g, " ").trim().replace(/^\./, "");
    if (/^([89]|1[0-3])$/.test(plain) && !(plain in bottoms)) {
      const yCls = cCls.split(/\s+/).find((c) => /^y[0-9a-z]+$/.test(c));
      if (yCls) {
        const mm = head.match(new RegExp("\\." + yCls + "\\{bottom:(-?[0-9.]+)px"));
        if (mm) bottoms[plain] = parseFloat(mm[1]);
      }
    }
    return m;
  });
  return bottoms;
}

// Captures the container + text classes of a sample cell so rows 8..13 can be
// built by cloning the template's own markup (identical on screen and print).
function captureCellClasses(pageHtml, sampleText, useLast) {
  const re = /<div class="(c [^"]+)"><div class="(t [^"]+)">([\s\S]*?)<\/div>/g;
  let m, found = null;
  while ((m = re.exec(pageHtml))) {
    const plain = m[3].replace(/<[^>]+>/g, "").replace(/\u00a0/g, " ").trim();
    if (plain === sampleText) {
      found = { cCls: m[1], tCls: m[2] };
      if (!useLast) break;
    }
  }
  return found;
}

export function buildFromMscTemplate(templateHtml, trip) {
  const t = trip || {};
  const date = fmtDate(t.travel_date);
  const time = esc(t.trip_time || "");
  const from = esc((t.route_from || "").toUpperCase());
  const to = esc((t.route_to || "").toUpperCase());
  const dest = `${from} TO ${to}`;
  const drivers = t.drivers || [];
  const passengers = t.passengers || [];
  const d1 = drivers[0] || {};
  const d2 = drivers[1] || {};
  const plate = esc(t.vehicle_plate || "");
  const car = esc(t.car_model || "");
  const secondPartyRaw = t.second_party_name || (passengers[0] || {}).name || "";
  const secondParty = esc(secondPartyRaw);
  // The inspection page and manifest need a driver name; fall back to the second party.
  const driver1Name = esc(d1.name || secondPartyRaw);

  // split into head + pages
  const parts = templateHtml.split(/(<div id="pf[123]")/);
  let head = parts[0];
  let p1 = (parts[1] || "") + (parts[2] || "");
  let p2 = (parts[3] || "") + (parts[4] || "");
  let p3 = (parts[5] || "") + (parts[6] || "");

  // ---------- Page 1: contract ----------
  p1 = replaceTDivs(p1, [
    (s) => s.includes("MEHREEN AMAN GUL") ? centered("M GORJON") : null,
    (s) => s === "M GORJON" ? centered("M GORJON") : null,
    (s) => s === "MADINA" ? from : null,
    (s) => s === "MAKKAH" ? to : null,
    (s) => s.startsWith("15-Jul-26") ? date : null,
  ]);

  // ---------- Page 2: manifest ----------
  // Capture row-7 sample cells and native row positions BEFORE sample values are replaced
  const nameTpl = captureCellClasses(p2, "AMBARAK");
  const idTpl = captureCellClasses(p2, "AD650819");
  const natTpl = captureCellClasses(p2, "LIBYA", true);
  const rowBottoms = extractRowBottoms(p2, head);

  // Nationality column header (the sample has "PAKISTAN" baked in next to the Arabic label)
  const natHeader = esc(((passengers[0] || {}).nationality || "").toUpperCase());
  p2 = p2.replace("PAKISTAN", natHeader);

  const pax = (row, field) => esc(((passengers[row] || {})[field]) || "");
  p2 = replaceTDivs(p2, [
    (s) => s.startsWith("DATE:") ? `DATE:${"&nbsp;".repeat(23)}${date}` : null,
    (s) => s.startsWith("TIME:") ? `TIME:${"&nbsp;".repeat(23)}${time}` : null,
    (s) => s === "MADINA TO MAKKAH" ? centered(dest) : null,
    (s) => s === "2348521457" ? centered(esc(d1.iqama_no || "")) : null,
    (s) => s === "2576768945" ? centered(esc(d2.iqama_no || "")) : null,
    (s) => s === "ZAHIR GUL" ? centered(driver1Name) : null,
    (s) => s === "IBRAR KHAN" ? centered(esc(d2.name || "")) : null,
    (s) => s === "2759 SXA" ? centered(plate) : null,
    (s) => s === "TOYOTA HIACE" ? centered(car) : null,
  ]);
  // passenger cells — nationality needs occurrence tracking (repeated sample values)
  let bd = 0, ly = 0;
  p2 = replaceTDivs(p2, [
    (s) => s === "BANGLADESH" ? centered(pax([0, 1, 2][bd++], "nationality")) : null,
    (s) => s === "LIBYA" ? centered(pax([3, 4, 5, 6][ly++], "nationality")) : null,
    (s) => {
      const idIdx = SAMPLE_ID.indexOf(s);
      return idIdx >= 0 ? centered(pax(idIdx, "id_number")) : null;
    },
    (s) => {
      const nmIdx = SAMPLE_NAME.indexOf(s);
      return nmIdx >= 0 ? centered(pax(nmIdx, "name")) : null;
    },
  ]);
  // rows 8..13 have no sample text — clone the template's own row-7 cells so
  // extra passengers align with the table both on screen and when printed
  const mkCell = (tpl, bottom, text) =>
    `<div class="${tpl.cCls}" style="bottom:${bottom}px;z-index:9">` +
    `<div class="${tpl.tCls}" style="left:0;width:266.667%;text-align:center">${text}</div></div>`;
  let extraCells = "";
  for (let i = 7; i < 13; i++) {
    const p = passengers[i];
    if (!p) continue;
    const b = rowBottoms[String(i + 1)];
    if (b !== undefined && nameTpl && idTpl && natTpl) {
      extraCells += mkCell(natTpl, b, esc(p.nationality || ""));
      extraCells += mkCell(idTpl, b, esc(p.id_number || ""));
      extraCells += mkCell(nameTpl, b, esc(p.name || ""));
    } else {
      const y = ROW_Y[i];
      extraCells += addedCell(COL_NAT, y, esc(p.nationality || ""));
      extraCells += addedCell(COL_ID, y, esc(p.id_number || ""));
      extraCells += addedCell(COL_NAME, y, esc(p.name || ""));
    }
  }
  if (extraCells) {
    p2 = p2.split('<div class="pc pc2 w0 h0">').join('<div class="pc pc2 w0 h0">' + extraCells);
  }

  // ---------- Page 3: inspection ----------
  p3 = replaceTDivs(p3, [
    (s) => s === "ZAHIR GUL" ? centered(driver1Name) : null,
    (s) => s === "15-Jul-26" ? centered(date) : null,
    (s) => s === "5:00 AM" ? centered(time) : null,
    (s) => s === "2759-SXA" || s === "2759 SXA" ? centered(plate) : null,
  ]);

  const extraCss = `
<style>
#sidebar{display:none!important}
#page-container{left:0!important}
.loading-indicator{display:none!important}
@media screen{.pc{display:block!important;opacity:1!important}}
@media print{@page{size:A4;margin:0}.pf{width:210mm!important;height:297mm!important;overflow:hidden;page-break-after:always;page-break-inside:avoid}.pf:last-child{page-break-after:auto}.pc{transform:scale(0.8885);transform-origin:0 0;width:112.55%!important;height:112.55%!important}}
</style>`;
  head = head.replace("</head>", extraCss + "\n</head>");
  head = head.replace("<title></title>", `<title>${esc(t.trip_name || "Trip Manifest")}</title>`);

  return head + p1 + p2 + p3;
}