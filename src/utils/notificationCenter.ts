import {
  endOfWeek,
  isSameDay,
  isThisWeek,
  isWithinInterval,
  startOfWeek,
} from 'date-fns';
import type {
  ParentAttendanceRow,
  ParentFeeNotification,
  ParentStudent,
} from '../services/parent';
import {
  kindFromStatus,
  parseRowDate,
  sessionTimeRange,
} from './dashboardHome';
import {
  formatLocalDate,
  formatLocalDateTime,
  formatRowLocalDateTime,
  parsePushTimestamp,
  parseRowLocalDateTime,
} from './localDateTime';

export type NotifAccent = 'danger' | 'warning' | 'success' | 'neutral';

export type CenterNotificationKind =
  | 'attendance'
  | 'fee_payment'
  | 'fee_reminder'
  | 'exam_results'
  | 'leave_status'
  | 'homework';

export type CenterNotification = {
  id: string;
  kind: CenterNotificationKind;
  accent: NotifAccent;
  statusLabel: string;
  headline: string;
  detail: string;
  timeLabel: string;
  at: Date;
  /** Present for attendance items only. */
  row?: ParentAttendanceRow;
  studentId?: number;
  studentName: string;
  /** True when newer than last time Notifications was opened. */
  unread?: boolean;
};

/** Default feed window — older items behind “Show older”. */
export const NOTIFICATION_RECENT_DAYS = 14;
const MAX_ATTENDANCE_IN_FEED = 20;
const MAX_INBOX_IN_FEED = 15;
const MAX_OLDER_ATTENDANCE = 10;
const MAX_OLDER_INBOX = 10;

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

function parseFeeCreatedAt(raw?: string | null): Date | null {
  return parsePushTimestamp(raw);
}

export function collectCenterNotifications(
  students: ParentStudent[],
  perStudentRows: Map<number, ParentAttendanceRow[]>,
  feeAlerts: ParentFeeNotification[] = [],
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
        kind: 'attendance',
        accent,
        statusLabel: statusUpperFromKind(k, row.status),
        headline,
        detail,
        timeLabel: formatRowLocalDateTime(row),
        at,
        row,
        studentId: s.id,
        studentName: s.name,
      });
    }
  }

  for (const fee of feeAlerts) {
    const at = parseFeeCreatedAt(fee.createdAt);
    if (!at) continue;
    const isExam = fee.type === 'exam_results_published';
    const isLeave = fee.type === 'leave_request_status';
    const isHomework = fee.type === 'homework_assigned';
    const isReminder = fee.type === 'fee_reminder';
    const kind: CenterNotificationKind = isExam
      ? 'exam_results'
      : isLeave
        ? 'leave_status'
        : isHomework
          ? 'homework'
          : isReminder
            ? 'fee_reminder'
            : 'fee_payment';
    items.push({
      id: fee.id || `fee-${fee.studentId}-${at.getTime()}`,
      kind,
      accent:
        isExam || isLeave || isHomework
          ? 'success'
          : isReminder
            ? 'warning'
            : 'success',
      statusLabel: isExam
        ? t
          ? t('notifications.examResultsLabel')
          : 'EXAM RESULTS'
        : isLeave
          ? t
            ? t('notifications.leaveLabel')
            : 'LEAVE'
          : isHomework
            ? t
              ? t('notifications.homeworkLabel')
              : 'HOMEWORK'
            : isReminder
              ? t
                ? t('notifications.feeReminderLabel')
                : 'FEE REMINDER'
              : t
                ? t('notifications.feePaymentLabel')
                : 'FEE RECEIVED',
      headline:
        fee.title ||
        (isExam
          ? 'Exam results'
          : isLeave
            ? 'Leave update'
            : isHomework
              ? 'New homework'
              : isReminder
                ? 'Fee reminder'
                : 'Fee received'),
      detail: fee.body || fee.studentName,
      timeLabel: formatLocalDateTime(at),
      at,
      studentId: fee.studentId,
      studentName: fee.studentName,
    });
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

function isInboxKind(kind: CenterNotificationKind): boolean {
  return kind !== 'attendance';
}

function trimByKindCaps(
  items: CenterNotification[],
  maxAttendance: number,
  maxInbox: number
): CenterNotification[] {
  const sorted = [...items].sort((a, b) => b.at.getTime() - a.at.getTime());
  const attendance: CenterNotification[] = [];
  const inbox: CenterNotification[] = [];
  for (const item of sorted) {
    if (isInboxKind(item.kind)) {
      if (inbox.length < maxInbox) inbox.push(item);
    } else if (attendance.length < maxAttendance) {
      attendance.push(item);
    }
  }
  return [...attendance, ...inbox].sort((a, b) => b.at.getTime() - a.at.getTime());
}

/** Split into recent (≤ days) vs older, with per-type caps. */
export function partitionRecentAndOlder(
  items: CenterNotification[],
  days = NOTIFICATION_RECENT_DAYS,
  now = new Date()
): { recent: CenterNotification[]; older: CenterNotification[] } {
  const cutoff = now.getTime() - days * 24 * 60 * 60 * 1000;
  const recentRaw: CenterNotification[] = [];
  const olderRaw: CenterNotification[] = [];
  for (const item of items) {
    if (item.at.getTime() >= cutoff) recentRaw.push(item);
    else olderRaw.push(item);
  }
  return {
    recent: trimByKindCaps(recentRaw, MAX_ATTENDANCE_IN_FEED, MAX_INBOX_IN_FEED),
    older: trimByKindCaps(olderRaw, MAX_OLDER_ATTENDANCE, MAX_OLDER_INBOX),
  };
}

/** Unread first, then newest. */
export function sortNotificationsUnreadFirst(
  items: CenterNotification[]
): CenterNotification[] {
  return [...items].sort((a, b) => {
    const au = a.unread ? 1 : 0;
    const bu = b.unread ? 1 : 0;
    if (au !== bu) return bu - au;
    return b.at.getTime() - a.at.getTime();
  });
}

export function applyUnreadFlags(
  items: CenterNotification[],
  lastOpenedAt: number | null
): CenterNotification[] {
  return items.map((item) => ({
    ...item,
    unread:
      lastOpenedAt != null ? item.at.getTime() > lastOpenedAt : false,
  }));
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
