/** YYYY-MM-DD for "now" in a given IANA timezone. */
export function dayInTz(tz: string, at: Date = new Date()): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(at);
  } catch {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "UTC",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(at);
  }
}

export function shiftDay(day: string, delta: number): string {
  const [y, m, d] = day.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + delta);
  return dt.toISOString().slice(0, 10);
}

export function daysBetween(a: string, b: string): number {
  const pa = Date.parse(a + "T00:00:00Z");
  const pb = Date.parse(b + "T00:00:00Z");
  return Math.round((pb - pa) / 86_400_000);
}

export function prettyDay(day: string): string {
  const [y, m, d] = day.split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

/** Issue number — days since the first issue. */
export const EPOCH = "2026-01-01";
export function issueNumber(day: string): number {
  return Math.max(1, daysBetween(EPOCH, day) + 1);
}

/**
 * The latest date live anywhere on earth (UTC+14). Used to bound "is this a
 * future issue?" so a link is never rejected just because the server guessed a
 * different timezone than the reader's.
 */
export function maxDayAnywhere(at: Date = new Date()): string {
  return dayInTz("Etc/GMT-14", at);
}
