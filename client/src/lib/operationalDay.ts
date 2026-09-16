/** Canonical Control Center operational calendar timezone (3D.4B/C). */
export const OPERATIONAL_TIMEZONE = "America/Bogota";

export type OperationalDayKind = "today" | "yesterday";

export type TemporalDayNav = OperationalDayKind;

/**
 * Calendar YYYY-MM-DD in the given IANA timezone (not UTC slice of ISO).
 */
export function getCalendarDateInTimeZone(
  date: Date,
  timeZone: string = OPERATIONAL_TIMEZONE,
): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/**
 * Operational day for Torre Hoy/Ayer.
 * Today = calendar date in timezone; yesterday = previous calendar day of that date
 * (date arithmetic on YYYY-MM-DD — not UTC ISO slice of `now`).
 */
export function getOperationalDay(
  kind: OperationalDayKind,
  timeZone: string = OPERATIONAL_TIMEZONE,
  now: Date = new Date(),
): string {
  const today = getCalendarDateInTimeZone(now, timeZone);
  if (kind === "today") return today;
  return shiftCalendarDate(today, -1);
}

/** Shift a YYYY-MM-DD by whole calendar days (UTC date parts — safe for civil dates). */
export function shiftCalendarDate(yyyyMmDd: string, deltaDays: number): string {
  const [y, m, d] = yyyyMmDd.split("-").map((p) => Number(p));
  if (!y || !m || !d) return yyyyMmDd;
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + deltaDays);
  return dt.toISOString().slice(0, 10);
}

export type TemporalDayQuery = {
  temporal_mode: "day";
  day: string;
  timezone: string;
  limit: string;
};

export function buildTemporalDayQuery(
  kind: OperationalDayKind,
  options?: {
    timeZone?: string;
    now?: Date;
    limit?: number;
  },
): TemporalDayQuery {
  const timeZone = options?.timeZone ?? OPERATIONAL_TIMEZONE;
  return {
    temporal_mode: "day",
    day: getOperationalDay(kind, timeZone, options?.now ?? new Date()),
    timezone: timeZone,
    limit: String(options?.limit ?? 200),
  };
}
