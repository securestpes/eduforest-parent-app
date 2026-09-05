import { format, isBefore, parseISO, startOfDay } from 'date-fns';
import type {
  ParentAttendanceRow,
  ParentBatchSchedule,
  ParentCalendarEvent,
} from '../../../services/parent';
import { kindFromStatus, parseRowDate } from '../../../utils/dashboardHome';

export function monthAttendancePct(rows: ParentAttendanceRow[]): number | null {
  const now = new Date();
  let total = 0;
  let attended = 0;
  for (const row of rows) {
    const dt = parseRowDate(row);
    if (!dt || dt.getFullYear() !== now.getFullYear() || dt.getMonth() !== now.getMonth()) continue;
    const k = kindFromStatus(row.status);
    if (k === 'unknown') continue;
    total += 1;
    if (k === 'present' || k === 'late') attended += 1;
  }
  if (!total) return null;
  return Math.round((100 * attended) / total);
}

export function safeParseDate(value?: string | null): Date | null {
  if (!value) return null;
  try {
    const d = parseISO(value.length <= 10 ? `${value}T00:00:00` : value);
    return Number.isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

export function formatInr(amount: number): string {
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `₹${Math.round(amount)}`;
  }
}

export function firstName(full?: string | null): string {
  if (!full?.trim()) return '';
  return full.trim().split(/\s+/)[0];
}

export function countHolidaysThisMonth(events: ParentCalendarEvent[]): number {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  return events.filter((e) => {
    if ((e.eventType || '').toUpperCase() !== 'HOLIDAY') return false;
    const d = safeParseDate(e.startDate);
    return d != null && d.getFullYear() === y && d.getMonth() === m;
  }).length;
}

export function upcomingCalendarEvents(
  events: ParentCalendarEvent[],
  limit = 3
): ParentCalendarEvent[] {
  const today = startOfDay(new Date());
  return events
    .map((e) => ({ e, d: safeParseDate(e.startDate) }))
    .filter((x): x is { e: ParentCalendarEvent; d: Date } => x.d != null && !isBefore(x.d, today))
    .sort((a, b) => a.d.getTime() - b.d.getTime())
    .map((x) => x.e)
    .filter((e, i, all) => all.findIndex((other) => other.id === e.id) === i)
    .slice(0, limit);
}

export function countUpcomingByType(
  events: ParentCalendarEvent[],
  type: string
): number {
  const today = startOfDay(new Date());
  const key = type.toUpperCase();
  return events.filter((e) => {
    if ((e.eventType || '').toUpperCase() !== key) return false;
    const d = safeParseDate(e.startDate);
    return d != null && !isBefore(d, today);
  }).length;
}

export function todayCalendarEvents(events: ParentCalendarEvent[]): ParentCalendarEvent[] {
  const today = startOfDay(new Date());
  return events.filter((e) => {
    const start = safeParseDate(e.startDate);
    const end = safeParseDate(e.endDate) ?? start;
    if (!start) return false;
    const from = startOfDay(start);
    const to = end ? startOfDay(end) : from;
    return !isBefore(today, from) && !isBefore(to, today);
  });
}

const JAVA_WEEKDAYS = [
  'SUNDAY',
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
] as const;

export function formatClockRange(
  start?: string | null,
  end?: string | null
): string {
  const fmt = (raw?: string | null) => {
    if (!raw) return '';
    const parts = raw.split(':');
    const h = Number(parts[0]);
    const m = Number(parts[1] ?? 0);
    if (Number.isNaN(h)) return raw;
    const d = new Date();
    d.setHours(h, Number.isNaN(m) ? 0 : m, 0, 0);
    return format(d, 'hh:mm a');
  };
  const a = fmt(start);
  const b = fmt(end);
  if (a && b) return `${a} - ${b}`;
  return a || b || '';
}

export function scheduleRunsOnDate(
  row: ParentBatchSchedule,
  day: Date = new Date()
): boolean {
  const key = format(day, 'yyyy-MM-dd');
  if (row.endDate && row.endDate < key) return false;
  if (Array.isArray(row.specificDates) && row.specificDates.includes(key)) {
    return true;
  }
  const javaDay = JAVA_WEEKDAYS[day.getDay()];
  const days = (row.daysOfWeek || []).map((d) => String(d).toUpperCase());
  if (days.length === 0) {
    return !row.specificDates?.length;
  }
  return days.some((d) => d === javaDay || d === javaDay.slice(0, 3) || d.includes(javaDay));
}

export function extractScheduleRows(data: unknown): ParentBatchSchedule[] {
  if (Array.isArray(data)) return data as ParentBatchSchedule[];
  if (data && typeof data === 'object') {
    const o = data as Record<string, unknown>;
    if (Array.isArray(o.content)) return o.content as ParentBatchSchedule[];
    if (Array.isArray(o.schedules)) return o.schedules as ParentBatchSchedule[];
    if (Array.isArray(o.data)) return o.data as ParentBatchSchedule[];
  }
  return [];
}
