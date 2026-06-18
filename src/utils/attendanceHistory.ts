import { format, parseISO } from 'date-fns';
import type { ParentAttendanceRow } from '../services/parent';
import { kindFromStatus, parseRowDate } from './dashboardHome';
import { formatLocalDate } from './localDateTime';

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
  pctPresent: number;
} {
  let present = 0;
  let absent = 0;
  let late = 0;
  let other = 0;
  for (const row of rows) {
    const k = kindFromStatus(row.status);
    if (k === 'present') present += 1;
    else if (k === 'absent') absent += 1;
    else if (k === 'late') late += 1;
    else other += 1;
  }
  const total = present + absent + late + other;
  const pctPresent = total > 0 ? Math.round((100 * present) / total) : 0;
  return { total, present, absent, late, pctPresent };
}

export type DaySection = { title: string; dayKey: string; data: ParentAttendanceRow[] };

export function groupRowsByDay(rows: ParentAttendanceRow[]): DaySection[] {
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
      title: format(d, 'EEEE, ') + formatLocalDate(d),
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
