import { endOfMonth, format, parseISO, startOfMonth } from 'date-fns';
import type { ParentAttendanceRow } from '../services/parent';
import { kindFromStatus, parseRowDate } from './dashboardHome';
import { formatLocalDate } from './localDateTime';
import type { AppLanguage } from '../common/contexts/parentTranslations';
import { formatAppDate } from './appDateLocale';

export type AttendanceFilter = 'all' | 'present' | 'absent' | 'late' | 'leave';

export function filterRowsByKind(rows: ParentAttendanceRow[], filter: AttendanceFilter): ParentAttendanceRow[] {
  if (filter === 'all') return rows;
  return rows.filter((r) => kindFromStatus(r.status) === filter);
}

export function rowsInCalendarMonth(rows: ParentAttendanceRow[], monthAnchor: Date): ParentAttendanceRow[] {
  const y = monthAnchor.getFullYear();
  const m = monthAnchor.getMonth();
  return rows.filter((r) => {
    const dt = parseRowDate(r);
    return dt && dt.getFullYear() === y && dt.getMonth() === m;
  });
}

export function monthSessionStats(rows: ParentAttendanceRow[]): {
  total: number;
  present: number;
  absent: number;
  late: number;
  leave: number;
  pctPresent: number;
} {
  let present = 0;
  let absent = 0;
  let late = 0;
  let leave = 0;
  for (const row of rows) {
    const k = kindFromStatus(row.status);
    if (k === 'present') present += 1;
    else if (k === 'absent') absent += 1;
    else if (k === 'late') late += 1;
    else if (k === 'leave') leave += 1;
  }
  const scored = present + absent + late;
  const total = scored + leave;
  const pctPresent = scored > 0 ? Math.round((100 * present) / scored) : 0;
  return { total, present, absent, late, leave, pctPresent };
}

export type DaySection = { title: string; dayKey: string; data: ParentAttendanceRow[] };

export function groupRowsByDay(
  rows: ParentAttendanceRow[],
  language: AppLanguage = 'en'
): DaySection[] {
  const map = new Map<string, ParentAttendanceRow[]>();
  for (const row of rows) {
    const dt = parseRowDate(row);
    if (!dt) continue;
    const key = format(dt, 'yyyy-MM-dd');
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(row);
  }
  const keys = [...map.keys()].sort((a, b) => b.localeCompare(a));
  return keys.map((k) => {
    const d = parseISO(`${k}T12:00:00`);
    return {
      dayKey: k,
      title: `${formatAppDate(d, 'EEEE', language)}, ${formatLocalDate(d)}`,
      data: map.get(k)!.sort((a, b) => {
        const ta = (a.startTime || '').localeCompare(b.startTime || '');
        if (ta !== 0) return -ta;
        return b.attendanceId - a.attendanceId;
      }),
    };
  });
}

export function lastNMonthAnchors(n: number, from = new Date()): Date[] {
  const out: Date[] = [];
  const y = from.getFullYear();
  const m = from.getMonth();
  for (let i = 0; i < n; i++) {
    const d = new Date(y, m - i, 1);
    out.push(d);
  }
  return out;
}

export function monthDayBreakdown(rows: ParentAttendanceRow[]): {
  totalDays: number;
  presentDays: number;
  absentDays: number;
  pctPresent: number;
} {
  const byDay = new Map<string, Set<string>>();
  for (const row of rows) {
    const dt = parseRowDate(row);
    if (!dt) continue;
    const key = format(dt, 'yyyy-MM-dd');
    const kinds = byDay.get(key) ?? new Set<string>();
    kinds.add(kindFromStatus(row.status));
    byDay.set(key, kinds);
  }

  let presentDays = 0;
  let absentDays = 0;
  for (const kinds of byDay.values()) {
    if (kinds.has('present') || kinds.has('late')) presentDays += 1;
    else if (kinds.has('absent')) absentDays += 1;
  }
  const scored = presentDays + absentDays;
  return {
    totalDays: byDay.size,
    presentDays,
    absentDays,
    pctPresent: scored > 0 ? Math.round((100 * presentDays) / scored) : 0,
  };
}

export function weekTrendInMonth(
  rows: ParentAttendanceRow[],
  monthAnchor: Date,
  language: AppLanguage = 'en'
): { label: string; pct: number }[] {
  const start = startOfMonth(monthAnchor);
  const end = endOfMonth(monthAnchor);
  const points: { label: string; pct: number }[] = [];
  for (let day = 1; day <= end.getDate(); day += 7) {
    const from = new Date(start.getFullYear(), start.getMonth(), day);
    const to = new Date(start.getFullYear(), start.getMonth(), Math.min(day + 6, end.getDate()), 23, 59, 59, 999);
    const slice = rows.filter((row) => {
      const dt = parseRowDate(row);
      return dt != null && dt >= from && dt <= to;
    });
    points.push({
      label: formatAppDate(from, 'dd MMM', language),
      pct: monthDayBreakdown(slice).pctPresent,
    });
  }
  return points;
}
