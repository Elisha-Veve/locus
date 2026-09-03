/** Full names, for pickers. Index 0 is January. */
export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sept", "Oct", "Nov", "Dec",
];

/** 'YYYY-MM' -> 'May 2024'. Empty string -> 'Present'. */
export function formatMonth(value: string): string {
  if (!value) return "Present";
  const [y, m] = value.split("-");
  const idx = Number(m) - 1;
  if (!y || Number.isNaN(idx) || idx < 0 || idx > 11) return value;
  return `${MONTHS[idx]} ${y}`;
}

export function formatRange(start: string, end: string): string {
  const from = start ? formatMonth(start) : "";
  const to = formatMonth(end);
  if (!from) return to;
  return `${from} – ${to}`;
}

/**
 * Sort key for reverse-chronological order: ongoing roles (no end date) first,
 * then by end date descending, then by start date descending.
 */
export function chronoKey(entry: { start_date: string; end_date: string }): string {
  const end = entry.end_date ? entry.end_date : "9999-99";
  const start = entry.start_date || "0000-00";
  return `${end}|${start}`;
}

export function byReverseChrono(
  a: { start_date: string; end_date: string },
  b: { start_date: string; end_date: string },
): number {
  return chronoKey(b).localeCompare(chronoKey(a));
}
