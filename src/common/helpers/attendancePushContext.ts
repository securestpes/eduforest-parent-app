import { format, parseISO } from 'date-fns';
import { bn, enUS, hi, ta } from 'date-fns/locale';
import type { AppLanguage } from '../contexts/parentTranslations';
import {
  extractStudentNameFromLegacyPushText,
  inferAttendanceStatusFromLegacyPushText,
} from './attendancePushParsing';
import { translateKey } from './translateKey';

export type AttendancePushStatus =
  | 'present'
  | 'absent'
  | 'late'
  | 'leave'
  | 'updated';

const dateFnsLocales = {
  en: enUS,
  hi,
  bn,
  ta,
} as const;

export function normalizeAttendancePushStatus(
  raw: string | undefined
): AttendancePushStatus {
  const value = (raw ?? '').trim().toLowerCase().replace(/_/g, ' ');
  if (value === 'present' || value === 'p') return 'present';
  if (value === 'absent' || value === 'a') return 'absent';
  if (value === 'late' || value === 'l') return 'late';
  if (value === 'leave' || value === 'on leave') return 'leave';
  return 'updated';
}

export type AttendancePushParams = {
  status: AttendancePushStatus;
  studentName: string;
  timePart: string;
};

export function formatAttendanceTimePart(
  timestamp: string | undefined,
  language: AppLanguage
): string {
  if (!timestamp?.trim()) {
    return '';
  }
  try {
    const date = parseISO(timestamp);
    if (Number.isNaN(date.getTime())) {
      return '';
    }
    const time = format(date, 'hh:mm a', { locale: dateFnsLocales[language] });
    return translateKey(language, 'voice.timeAt', { time });
  } catch {
    return '';
  }
}

/** Shared FCM attendance fields for localized push title/body and voice. */
export function resolveAttendancePushParams(
  data: Record<string, string | undefined> | null | undefined,
  language: AppLanguage
): AttendancePushParams | null {
  if (!data) {
    return null;
  }

  const legacyText = [
    data.voice_message,
    data.short_message,
    data.body,
  ].join(' ');

  let status = normalizeAttendancePushStatus(
    data.status ?? data.statusLegacy
  );
  if (status === 'updated') {
    const inferred = inferAttendanceStatusFromLegacyPushText(legacyText);
    if (inferred) {
      status = inferred;
    }
  }

  const defaultStudent = translateKey(language, 'voice.defaultStudentName');
  let studentName =
    (data.studentName ?? data.child_name ?? '').trim() || defaultStudent;
  if (studentName === defaultStudent) {
    const extracted = extractStudentNameFromLegacyPushText(
      data.voice_message,
      data.short_message,
      data.body
    );
    if (extracted) {
      studentName = extracted;
    }
  }

  const timePart = formatAttendanceTimePart(data.timestamp, language);

  return { status, studentName, timePart };
}
