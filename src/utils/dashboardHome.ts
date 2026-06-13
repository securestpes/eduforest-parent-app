import {
  differenceInDays,
  differenceInHours,
  endOfWeek,
  format,
  parseISO,
  startOfWeek,
} from 'date-fns';
import type { ParentAttendanceRow, ParentStudent } from '../services/parent';

export type StatusKind = 'present' | 'absent' | 'late' | 'unknown';

export function kindFromStatus(status: string): StatusKind {
  const s = status.toLowerCase();
  if (s.includes('present')) return 'present';
  if (s.includes('absent')) return 'absent';
  if (s.includes('late')) return 'late';
  return 'unknown';
}

export function parseRowDate(row: ParentAttendanceRow): Date | null {
  try {
    const d = row.sessionDate;
    if (d.includes('T')) return parseISO(d);
    return parseISO(d.length === 10 ? `${d}T12:00:00` : d);
  } catch {
    return null;
  }
}

export function aggregateFamilyStats(
  perStudentRows: Map<number, ParentAttendanceRow[]>,
  now = new Date()
): { monthPct: number; weekPresent: number; monthLate: number } {
  const cy = now.getFullYear();
  const cm = now.getMonth();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

  let monthTotal = 0;
  let monthPresent = 0;
  let monthLate = 0;
  let weekPresent = 0;

  for (const rows of perStudentRows.values()) {
    for (const row of rows) {
      const dt = parseRowDate(row);
      if (!dt) continue;
      const k = kindFromStatus(row.status);
      if (dt.getFullYear() === cy && dt.getMonth() === cm) {
        monthTotal += 1;
        if (k === 'present') monthPresent += 1;
        if (k === 'late') monthLate += 1;
      }
      if (dt >= weekStart && dt <= weekEnd && k === 'present') {
        weekPresent += 1;
      }
    }
  }

  const monthPct = monthTotal > 0 ? Math.round((100 * monthPresent) / monthTotal) : 0;
  return { monthPct, weekPresent, monthLate };
}

export function latestRow(rows: ParentAttendanceRow[]): ParentAttendanceRow | null {
  if (!rows.length) return null;
  return [...rows].sort((a, b) => {
    const da = parseRowDate(a)?.getTime() ?? 0;
    const db = parseRowDate(b)?.getTime() ?? 0;
    return db - da;
  })[0];
}

export type DashboardNotif = {
  id: string;
  accent: 'danger' | 'warning' | 'success' | 'neutral';
  headline: string;
  detail: string;
  timeLabel: string;
};

function toAmPm(raw?: string): string {
  if (!raw) return '';
  const cleaned = raw.trim();
  const m = cleaned.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!m) return cleaned;
  const hours = Number(m[1]);
  const mins = m[2];
  if (Number.isNaN(hours) || hours < 0 || hours > 23) return cleaned;
  const meridiem = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${String(hour12).padStart(2, '0')}:${mins} ${meridiem}`;
}

export function sessionTimeRange(row: ParentAttendanceRow): string {
  const st = toAmPm(row.startTime);
  const en = toAmPm(row.endTime);
  if (st && en) return `${st} – ${en}`;
  return st || en || '';
}

export function formatTimeAgo(
  at: Date,
  t: (key: import('../../common/contexts/parentTranslations').TranslationKey, params?: Record<string, string | number>) => string,
  now = new Date()
): string {
  if (at > now) return t('timeAgo.justNow');
  const hrs = differenceInHours(now, at);
  if (hrs < 1) return t('timeAgo.justNow');
  if (hrs < 24) return hrs === 1 ? t('timeAgo.hourAgo') : t('timeAgo.hoursAgo', { count: hrs });
  const days = differenceInDays(now, at);
  if (days === 1) return t('timeAgo.yesterday');
  if (days < 7) return t('timeAgo.daysAgo', { count: days });
  return format(at, 'dd MMM yyyy');
}

export function notificationsFromAttendance(
  students: ParentStudent[],
  perStudentRows: Map<number, ParentAttendanceRow[]>,
  limit = 6,
  t?: (key: import('../../common/contexts/parentTranslations').TranslationKey, params?: Record<string, string | number>) => string,
  studentId?: number | null
): DashboardNotif[] {
  const scopedStudents =
    studentId != null ? students.filter((s) => s.id === studentId) : students;
  const items: { row: ParentAttendanceRow; studentName: string; at: Date }[] = [];
  for (const s of scopedStudents) {
    const rows = perStudentRows.get(s.id) ?? [];
    for (const row of rows) {
      const at = parseRowDate(row);
      if (at) items.push({ row, studentName: s.name, at });
    }
  }
  items.sort((a, b) => b.at.getTime() - a.at.getTime());

  const singleChild = scopedStudents.length === 1;
  const out: DashboardNotif[] = [];
  for (let i = 0; i < Math.min(limit, items.length); i++) {
    const { row, studentName, at } = items[i];
    const k = kindFromStatus(row.status);
    const accent: DashboardNotif['accent'] =
      k === 'absent' ? 'danger' : k === 'late' ? 'warning' : k === 'present' ? 'success' : 'neutral';
    let headline: string;
    if (singleChild) {
      if (k === 'absent') headline = `Marked absent · ${row.batchName}`;
      else if (k === 'late') headline = `Late · ${row.batchName}`;
      else if (k === 'present') headline = `Present · ${row.batchName}`;
      else headline = `${row.status} · ${row.batchName}`;
    } else if (k === 'absent') {
      headline = `${studentName} marked ABSENT in ${row.batchName}`;
    } else if (k === 'late') {
      headline = `${studentName} was LATE (${row.batchName})`;
    } else if (k === 'present') {
      headline = `${studentName} marked present · ${row.batchName}`;
    } else {
      headline = `${studentName} · ${row.status} · ${row.batchName}`;
    }
    const range = sessionTimeRange(row);
    const detail = range ? `Class: ${range}` : row.batchName;
    out.push({
      id: `n-${row.attendanceId}-${i}`,
      accent,
      headline,
      detail,
      timeLabel: t ? formatTimeAgo(at, t) : format(at, 'dd MMM yyyy'),
    });
  }
  return out;
}

export function formatLastSessionLine(row: ParentAttendanceRow): string {
  const dt = parseRowDate(row);
  const dateStr = dt ? format(dt, 'dd MMM yyyy') : row.sessionDate;
  const t = row.endTime?.slice(0, 5) || row.startTime?.slice(0, 5) || '';
  const k = kindFromStatus(row.status);
  if (k === 'present') {
    const check = row.startTime?.slice(0, 5) ?? t;
    return check ? `Checked in: ${check}` : `Present · ${dateStr}`;
  }
  return t ? `Last: ${dateStr} · ${t}` : `Last: ${dateStr}`;
}
