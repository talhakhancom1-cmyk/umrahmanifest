// Current date/time in Saudi Arabia (Asia/Riyadh) — used as the default
// date & time when creating a manifest. Both stay editable by the operator.
const TZ = "Asia/Riyadh";

export function saudiDate() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
  return parts; // YYYY-MM-DD
}

export function saudiTime() {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    hour: "numeric",
    minute: "2-digit",
    hour12: true
  })
    .format(new Date())
    .replace(/\u202f/g, " ");
}