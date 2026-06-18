import { format, isValid, parseISO } from 'date-fns';
import type { ParentAttendanceRow } from '../services/parent';

export const LOCAL_DATE_TIME = 'MMM d, yyyy, h:mm a';
export const LOCAL_DATE = 'MMM d, yyyy';
export const LOCAL_TIME = 'h:mm a';

/** Parses API/FCM ISO timestamps (UTC or offset) for display in device local time. Naive strings are treated as UTC. */
export function parsePushTimestamp(iso?: string | null): Date | null {
  if (!iso?.trim()) {
    return null;
  }
  const trimmed = iso.trim();
  try {
    const hasOffset = /[zZ]$/.test(trimmed) || /[+-]\d{2}:\d{2}$/.test(trimmed);
    const parsed = parseISO(hasOffset ? trimmed : `${trimmed}Z`);
    return isValid(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function formatLocalDateTime(value: Date | number): string {
  const date = value instanceof Date ? value : new Date(value);
  if (!isValid(date)) return '';
  return format(date, LOCAL_DATE_TIME);
}

export function formatLocalDate(value: Date | number): string {
  const date = value instanceof Date ? value : new Date(value);
  if (!isValid(date)) return '';
  return format(date, LOCAL_DATE);
}

export function formatLocalTime(value: Date | number): string {
  const date = value instanceof Date ? value : new Date(value);
  if (!isValid(date)) return '';
  return format(date, LOCAL_TIME);
}

/** Formats API clock strings (HH:mm or HH:mm:ss) in 12-hour local form. */
export function formatApiTime(raw?: string | null): string {
  if (!raw?.trim()) return '';
  const cleaned = raw.trim();
  const m = cleaned.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!m) return cleaned;
  const hours = Number(m[1]);
  const mins = m[2];
  if (Number.isNaN(hours) || hours < 0 || hours > 23) return cleaned;
  const meridiem = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${hour12}:${mins} ${meridiem}`;
}

export function formatApiTimeRange(
  start?: string | null,
  end?: string | null
): string {
  const st = formatApiTime(start);
  const en = formatApiTime(end);
  if (st && en) return `${st} – ${en}`;
  return st || en || '';
}

function normalizeApiClock(raw?: string): string {
  if (!raw?.trim()) return '12:00:00';
  const m = raw.trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!m) return '12:00:00';
  return `${m[1].padStart(2, '0')}:${m[2]}:${(m[3] ?? '00').padStart(2, '0')}`;
}

/** Combines API session date + class time as a local Date (no UTC offset). */
export function parseRowLocalDateTime(row: ParentAttendanceRow): Date | null {
  try {
    const raw = row.sessionDate?.trim();
    if (!raw) return null;
    const dateOnly = raw.includes('T') ? raw.split('T')[0]! : raw.slice(0, 10);
    if (dateOnly.length !== 10) return null;
    const clock = normalizeApiClock(row.startTime || row.endTime);
    const parsed = parseISO(`${dateOnly}T${clock}`);
    return isValid(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function formatRowLocalDateTime(row: ParentAttendanceRow): string {
  const at = parseRowLocalDateTime(row);
  if (at) return formatLocalDateTime(at);

  const dateOnly = row.sessionDate?.trim().slice(0, 10) ?? '';
  const time = formatApiTime(row.startTime || row.endTime);
  if (dateOnly.length === 10) {
    const date = parseISO(`${dateOnly}T12:00:00`);
    if (isValid(date)) {
      return time
        ? `${formatLocalDate(date)}, ${time}`
        : formatLocalDate(date);
    }
  }
  return time || dateOnly;
}
