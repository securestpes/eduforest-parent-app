import {
  endOfWeek,
  isSameDay,
  isThisWeek,
  isWithinInterval,
  startOfWeek,
} from 'date-fns';
import type { ParentAttendanceRow, ParentStudent } from '../services/parent';
import {
  kindFromStatus,
  parseRowDate,
  sessionTimeRange,
} from './dashboardHome';
import { formatLocalDate, formatRowLocalDateTime, parseRowLocalDateTime } from './localDateTime';

export type NotifAccent = 'danger' | 'warning' | 'success' | 'neutral';

export type CenterNotification = {
  id: string;
  accent: NotifAccent;
  statusLabel: string;
  headline: string;
  detail: string;
  timeLabel: string;
  at: Date;
  row: ParentAttendanceRow;
  studentName: string;
};

function statusUpperFromKind(
  kind: ReturnType<typeof kindFromStatus>,
  raw: string
): string {
  if (kind === 'present') return 'PRESENT';
  if (kind === 'absent') return 'ABSENT';
  if (kind === 'late') return 'LATE';
  if (kind === 'leave') return 'LEAVE';
  return raw.toUpperCase();
}

export function collectCenterNotifications(
  students: ParentStudent[],
  perStudentRows: Map<number, ParentAttendanceRow[]>,
  t?: (
    key: import('../common/contexts/parentTranslations').TranslationKey,
    params?: Record<string, string | number>
  ) => string
): CenterNotification[] {
  const items: CenterNotification[] = [];
  for (const s of students) {
    const rows = perStudentRows.get(s.id) ?? [];
    for (const row of rows) {
      const at = parseRowLocalDateTime(row) ?? parseRowDate(row);
      if (!at) continue;
      const k = kindFromStatus(row.status);
      const accent: NotifAccent =
        k === 'absent'
          ? 'danger'
          : k === 'late'
            ? 'warning'
            : k === 'present'
              ? 'success'
              : 'neutral';
      let headline: string;
      if (k === 'absent') {
        headline = `${s.name} was marked ABSENT in ${row.batchName}`;
      } else if (k === 'late') {
        headline = `${s.name} was marked LATE in ${row.batchName}`;
      } else if (k === 'present') {
        headline = `${s.name} marked present · ${row.batchName}`;
      } else if (k === 'leave') {
        headline = `${s.name} is on leave · ${row.batchName}`;
      } else {
        headline = `${s.name} · ${row.status} · ${row.batchName}`;
      }
      const range = sessionTimeRange(row);
      const detail = range ? `Class: ${range}` : row.batchName;
      items.push({
        id: `cn-${row.attendanceId}`,
        accent,
        statusLabel: statusUpperFromKind(k, row.status),
        headline,
        detail,
        timeLabel: formatRowLocalDateTime(row),
        at,
        row,
        studentName: s.name,
      });
    }
  }
  items.sort((a, b) => b.at.getTime() - a.at.getTime());
  return items;
}

export function splitNotificationsByRecency(
  items: CenterNotification[],
  now = new Date()
) {
  const today: CenterNotification[] = [];
  const thisWeekNotToday: CenterNotification[] = [];
  const earlier: CenterNotification[] = [];

  for (const it of items) {
    if (isSameDay(it.at, now)) {
      today.push(it);
    } else if (isThisWeek(it.at, { weekStartsOn: 1 })) {
      thisWeekNotToday.push(it);
    } else {
      earlier.push(it);
    }
  }
  return { today, thisWeekNotToday, earlier };
}

export type WeeklySummaryBlock = {
  title: string;
  dateStr: string;
  lines: string[];
};

export function buildWeeklySummary(
  students: ParentStudent[],
  perStudentRows: Map<number, ParentAttendanceRow[]>,
  now = new Date()
): WeeklySummaryBlock | null {
  const start = startOfWeek(now, { weekStartsOn: 1 });
  const end = endOfWeek(now, { weekStartsOn: 1 });
  const lines: string[] = [];

  for (const s of students) {
    const rows = perStudentRows.get(s.id) ?? [];
    let p = 0;
    let a = 0;
    let l = 0;
    for (const r of rows) {
      const d = parseRowDate(r);
      if (!d || !isWithinInterval(d, { start, end })) continue;
      const k = kindFromStatus(r.status);
      if (k === 'present') p += 1;
      else if (k === 'absent') a += 1;
      else if (k === 'late') l += 1;
    }
    if (p + a + l > 0) {
      lines.push(`${s.name}: ${p} Present / ${a} Absent / ${l} Late`);
    }
  }

  if (lines.length === 0) return null;
  return {
    title: 'Weekly report',
    dateStr: formatLocalDate(now),
    lines,
  };
}
