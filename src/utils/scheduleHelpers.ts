import { format, getDay, isSameDay, parseISO } from 'date-fns';
import type { ParentAttendanceRow, ParentSchedule } from '../services/parent';
import { kindFromStatus, parseRowDate } from './dashboardHome';
import { formatApiTimeRange } from './localDateTime';

const JS_DAY_TO_JAVA: Record<number, string> = {
  0: 'SUNDAY',
  1: 'MONDAY',
  2: 'TUESDAY',
  3: 'WEDNESDAY',
  4: 'THURSDAY',
  5: 'FRIDAY',
  6: 'SATURDAY',
};

export function scheduleRunsOnDate(schedule: ParentSchedule, date: Date): boolean {
  if (schedule.endDate) {
    try {
      const end = parseISO(
        schedule.endDate.length === 10 ? `${schedule.endDate}T23:59:59` : schedule.endDate
      );
      if (date > end) return false;
    } catch {
      /* ignore */
    }
  }

  const type = (schedule.scheduleType || '').toUpperCase();
  if (type.includes('CUSTOM') && schedule.specificDates?.length) {
    const iso = format(date, 'yyyy-MM-dd');
    return schedule.specificDates.some((d) => d.startsWith(iso));
  }

  const dayName = JS_DAY_TO_JAVA[getDay(date)];
  if (schedule.daysOfWeek?.length) {
    return schedule.daysOfWeek.some((d) => d.toUpperCase() === dayName);
  }

  return true;
}

export function schedulesForDate(schedules: ParentSchedule[], date: Date): ParentSchedule[] {
  return schedules.filter((s) => scheduleRunsOnDate(s, date));
}

export function formatScheduleTimeRange(schedule: ParentSchedule): string {
  return formatApiTimeRange(schedule.startTime, schedule.endTime);
}

function minutesFromApiTime(raw?: string | null): number | null {
  if (!raw?.trim()) return null;
  const m = raw.trim().match(/^(\d{1,2}):(\d{2})/);
  if (!m) return null;
  const hours = Number(m[1]);
  const mins = Number(m[2]);
  if (!Number.isFinite(hours) || !Number.isFinite(mins)) return null;
  return hours * 60 + mins;
}

export type NextClassPhase = 'upcoming' | 'in_progress' | 'ended' | 'none';

export function resolveNextClassToday(
  schedules: ParentSchedule[],
  now = new Date()
): { schedule: ParentSchedule | null; phase: NextClassPhase } {
  const today = schedulesForDate(schedules, now).sort((a, b) => {
    const sa = minutesFromApiTime(a.startTime) ?? 0;
    const sb = minutesFromApiTime(b.startTime) ?? 0;
    return sa - sb;
  });
  if (!today.length) return { schedule: null, phase: 'none' };

  const nowMins = now.getHours() * 60 + now.getMinutes();
  for (const schedule of today) {
    const start = minutesFromApiTime(schedule.startTime);
    const end = minutesFromApiTime(schedule.endTime);
    if (start == null) continue;
    if (nowMins < start) return { schedule, phase: 'upcoming' };
    if (end != null && nowMins >= start && nowMins <= end) {
      return { schedule, phase: 'in_progress' };
    }
  }
  return { schedule: today[today.length - 1], phase: 'ended' };
}

export type TodayStatusKind =
  | 'present'
  | 'absent'
  | 'late'
  | 'leave'
  | 'not_marked'
  | 'no_class';

export function todayAttendanceForStudent(
  rows: ParentAttendanceRow[],
  date = new Date()
): ParentAttendanceRow | null {
  for (const row of rows) {
    const dt = parseRowDate(row);
    if (dt && isSameDay(dt, date)) return row;
  }
  return null;
}

export function resolveTodayStatus(
  schedules: ParentSchedule[],
  rows: ParentAttendanceRow[],
  date = new Date()
): { kind: TodayStatusKind; row: ParentAttendanceRow | null; todaySchedules: ParentSchedule[] } {
  const todaySchedules = schedulesForDate(schedules, date);
  const row = todayAttendanceForStudent(rows, date);
  if (row) {
    const k = kindFromStatus(row.status);
    if (k === 'present' || k === 'absent' || k === 'late' || k === 'leave') {
      return { kind: k, row, todaySchedules };
    }
  }
  if (todaySchedules.length === 0) {
    return { kind: 'no_class', row: null, todaySchedules };
  }
  return { kind: 'not_marked', row: null, todaySchedules };
}
