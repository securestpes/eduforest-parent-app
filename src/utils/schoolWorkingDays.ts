/**
 * Matches school working days on the client (Mon–Sat default; Sunday is never open).
 */

export const DEFAULT_SCHOOL_WORKING_DAYS = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
] as const;

const JS_DAY_TO_NAME = [
  'SUNDAY',
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
] as const;

export const WEEKDAY_HEADER_KEYS = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
] as const;

export function normalizeWorkingDays(raw?: string[] | null): string[] {
  const parsed = (raw ?? [])
    .map((day) => String(day).trim().toUpperCase())
    .filter((day) => day && day !== 'SUNDAY');
  return parsed.length ? [...new Set(parsed)] : [...DEFAULT_SCHOOL_WORKING_DAYS];
}

export function schoolDayName(date: Date): string {
  return JS_DAY_TO_NAME[date.getDay()];
}

export function isSchoolOpenDay(date: Date, workingDays: string[]): boolean {
  return workingDays.includes(schoolDayName(date));
}

export function nextSchoolOpenDay(date: Date, workingDays: string[]): Date {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  for (let i = 0; i < 8; i += 1) {
    if (isSchoolOpenDay(next, workingDays)) return next;
    next.setDate(next.getDate() + 1);
  }
  return next;
}

export function nextSchoolOpenDayInSession(
  date: Date,
  workingDays: string[],
  range: { start: Date; end: Date } | null
): Date {
  if (!range) return nextSchoolOpenDay(date, workingDays);
  const start = new Date(range.start.getFullYear(), range.start.getMonth(), range.start.getDate());
  const end = new Date(range.end.getFullYear(), range.end.getMonth(), range.end.getDate());
  let cursor = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  if (cursor.getTime() < start.getTime()) cursor = new Date(start);
  if (cursor.getTime() > end.getTime()) cursor = new Date(end);
  const forward = new Date(cursor);
  while (forward.getTime() <= end.getTime()) {
    if (isSchoolOpenDay(forward, workingDays)) return forward;
    forward.setDate(forward.getDate() + 1);
  }
  const backward = new Date(cursor);
  while (backward.getTime() >= start.getTime()) {
    if (isSchoolOpenDay(backward, workingDays)) return backward;
    backward.setDate(backward.getDate() - 1);
  }
  return cursor;
}
