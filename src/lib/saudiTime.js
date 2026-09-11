// Saudi Arabia clock (UTC+3, no DST) computed from UTC arithmetic so it never
// depends on the computer's local timezone or Intl timezone data.
const OFFSET_MS = 3 * 60 * 60 * 1000;

function saudiNow() {
  return new Date(Date.now() + OFFSET_MS);
}

const p2 = (n) => String(n).padStart(2, "0");

export function saudiDate() {
  const d = saudiNow();
  return `${d.getUTCFullYear()}-${p2(d.getUTCMonth() + 1)}-${p2(d.getUTCDate())}`;
}

export function saudiTime() {
  const d = saudiNow();
  const h24 = d.getUTCHours();
  const h = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h}:${p2(d.getUTCMinutes())} ${h24 < 12 ? "AM" : "PM"}`;
}