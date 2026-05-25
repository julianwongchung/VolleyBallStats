export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`;
}

export function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

const shortMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatDate(value: string) {
  const parts = isoDateParts(value);
  if (!parts) return value;
  return `${shortMonths[parts.month - 1]} ${parts.day}, ${parts.year}`;
}

export function formatDateBadge(value: string) {
  const parts = isoDateParts(value);
  if (!parts) return { day: "--", month: "---", time: "TBD" };
  return {
    day: String(parts.day).padStart(2, "0"),
    month: shortMonths[parts.month - 1].toUpperCase(),
    time: "TBD"
  };
}

export function formatDateTime(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/.exec(value);
  if (!match) return value;
  const date = formatDate(`${match[1]}-${match[2]}-${match[3]}`);
  if (!match[4] || !match[5]) return date;

  const hour24 = Number(match[4]);
  const minute = match[5];
  const period = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 || 12;
  return `${date}, ${hour12}:${minute} ${period}`;
}

function isoDateParts(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { year, month, day };
}
