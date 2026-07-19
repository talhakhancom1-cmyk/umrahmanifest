import { format, parseISO } from "date-fns";

export function formatTripDate(d) {
  if (!d) return "";
  try {
    return format(parseISO(d), "dd-MMM-yy");
  } catch {
    return d;
  }
}