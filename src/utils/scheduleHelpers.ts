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

export type TodayStatusKind = 'present' | 'absent' | 'late' | 'not_marked' | 'no_class';

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
    if (k === 'present' || k === 'absent' || k === 'late') {
      return { kind: k, row, todaySchedules };
    }
  }
  if (todaySchedules.length === 0) {
    return { kind: 'no_class', row: null, todaySchedules };
  }
  return { kind: 'not_marked', row: null, todaySchedules };
}
