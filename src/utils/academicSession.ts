/**
 * India-style academic session helpers.
 * Name "2026-27" → 1 Apr 2026 – 31 Mar 2027.
 */

const SESSION_NAME_PATTERN = /^(\d{4})\s*[-–—/]\s*(\d{2}|\d{4})$/;

export type ParsedSessionYears = {
  startYear: number;
  endYear: number;
};

function parseDay(value?: string | Date | null): Date | null {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  const raw = String(value).trim();
  if (!raw) return null;
  const date = new Date(raw.length <= 10 ? `${raw}T12:00:00` : raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function parseAcademicSessionYears(
  displayName?: string | null
): ParsedSessionYears | null {
  if (!displayName?.trim()) return null;
  const match = displayName.trim().match(SESSION_NAME_PATTERN);
  if (!match) return null;
  const startYear = Number(match[1]);
  let endYear = Number(match[2]);
  if (!Number.isFinite(startYear) || !Number.isFinite(endYear)) return null;
  if (match[2].length === 2) {
    endYear = Math.floor(startYear / 100) * 100 + endYear;
    if (endYear < startYear) endYear += 100;
  }
  return { startYear, endYear };
}

export function academicYearWindow(years: ParsedSessionYears): {
  windowStart: Date;
  windowEnd: Date;
} {
  return {
    windowStart: new Date(years.startYear, 3, 1),
    windowEnd: new Date(years.endYear, 2, 31, 23, 59, 59, 999),
  };
}

export function resolveSessionRange(opts: {
  startDate?: string | Date | null;
  endDate?: string | Date | null;
  academicYear?: string | null;
}): { start: Date; end: Date } | null {
  const start = parseDay(opts.startDate);
  const end = parseDay(opts.endDate);
  if (start && end && end.getTime() >= start.getTime()) {
    return { start, end };
  }
  const years = parseAcademicSessionYears(opts.academicYear);
  if (!years) return null;
  const { windowStart, windowEnd } = academicYearWindow(years);
  return { start: windowStart, end: windowEnd };
}

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function isDateInSession(
  date: Date,
  range: { start: Date; end: Date } | null
): boolean {
  if (!range) return true;
  const t = startOfLocalDay(date).getTime();
  return (
    t >= startOfLocalDay(range.start).getTime() &&
    t <= startOfLocalDay(range.end).getTime()
  );
}

export function isMonthInSession(
  date: Date,
  range: { start: Date; end: Date } | null
): boolean {
  if (!range) return true;
  const k = monthKey(date);
  return k >= monthKey(range.start) && k <= monthKey(range.end);
}

export function monthKey(date: Date): number {
  return date.getFullYear() * 12 + date.getMonth();
}

/** Newest-first month anchors inside the current session. */
export function sessionMonthAnchors(
  range: { start: Date; end: Date } | null,
  now = new Date(),
  opts?: { includeFuture?: boolean }
): Date[] {
  if (!range) return [];
  const startKey = monthKey(range.start);
  const endCap =
    opts?.includeFuture || now.getTime() >= range.end.getTime()
      ? range.end
      : now;
  let y = endCap.getFullYear();
  let m = endCap.getMonth();
  const out: Date[] = [];
  while (y * 12 + m >= startKey) {
    out.push(new Date(y, m, 1));
    m -= 1;
    if (m < 0) {
      m = 11;
      y -= 1;
    }
  }
  return out;
}

export function clampMonthToSession(
  month: Date,
  months: Date[]
): Date {
  if (!months.length) return month;
  const key = monthKey(month);
  if (months.some((item) => monthKey(item) === key)) {
    return new Date(month.getFullYear(), month.getMonth(), 1);
  }
  return months[0];
}
