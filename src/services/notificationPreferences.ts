import AsyncStorage from '@react-native-async-storage/async-storage';
import { localStorageKeys } from '../common/constants';
import { syncNativeNotificationPrefs } from '../common/helpers/syncNativeNotificationPrefs';

export type NotificationPreferences = {
  alertPresent: boolean;
  alertLate: boolean;
  alertAbsent: boolean;
  quietHoursEnabled: boolean;
  quietStart: string;
  quietEnd: string;
  /** Empty = all linked children */
  childIds: number[];
};

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  alertPresent: true,
  alertLate: true,
  alertAbsent: true,
  quietHoursEnabled: false,
  quietStart: '22:00',
  quietEnd: '07:00',
  childIds: [],
};

export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  const raw = await AsyncStorage.getItem(
    localStorageKeys.NOTIFICATION_PREFERENCES
  );
  if (!raw) return { ...DEFAULT_NOTIFICATION_PREFERENCES };
  try {
    const parsed = JSON.parse(raw) as Partial<NotificationPreferences>;
    return {
      ...DEFAULT_NOTIFICATION_PREFERENCES,
      ...parsed,
      childIds: Array.isArray(parsed.childIds)
        ? parsed.childIds.filter((id) => typeof id === 'number')
        : [],
    };
  } catch {
    return { ...DEFAULT_NOTIFICATION_PREFERENCES };
  }
}

export async function saveNotificationPreferences(
  updates: Partial<NotificationPreferences>
): Promise<NotificationPreferences> {
  const current = await getNotificationPreferences();
  const next = { ...current, ...updates };
  await AsyncStorage.setItem(
    localStorageKeys.NOTIFICATION_PREFERENCES,
    JSON.stringify(next)
  );
  syncNativeNotificationPrefs(next);
  return next;
}

function parseMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map((v) => Number(v));
  if (!Number.isFinite(h)) return 0;
  return h * 60 + (Number.isFinite(m) ? m : 0);
}

export function isQuietHoursActive(
  prefs: NotificationPreferences,
  now = new Date()
): boolean {
  if (!prefs.quietHoursEnabled) return false;
  const mins = now.getHours() * 60 + now.getMinutes();
  const start = parseMinutes(prefs.quietStart);
  const end = parseMinutes(prefs.quietEnd);
  if (start === end) return false;
  if (start < end) return mins >= start && mins < end;
  return mins >= start || mins < end;
}

export function normalizePushStatus(
  data: Record<string, string>
): 'present' | 'absent' | 'late' | 'other' {
  const s = (data.status ?? data.statusLegacy ?? '').toLowerCase();
  if (s.includes('absent')) return 'absent';
  if (s.includes('late')) return 'late';
  if (s.includes('present')) return 'present';
  return 'other';
}

export function shouldShowAttendanceNotification(
  data: Record<string, string>,
  prefs: NotificationPreferences
): boolean {
  const studentIdRaw = data.studentId ?? data.student_id ?? data.child_id;
  const studentId = studentIdRaw ? Number(studentIdRaw) : NaN;
  if (prefs.childIds.length > 0 && Number.isFinite(studentId)) {
    if (!prefs.childIds.includes(studentId)) return false;
  }

  const status = normalizePushStatus(data);
  if (status === 'present' && !prefs.alertPresent) return false;
  if (status === 'late' && !prefs.alertLate) return false;
  if (status === 'absent' && !prefs.alertAbsent) return false;
  return true;
}

export function shouldPlayVoiceForNotification(
  data: Record<string, string>,
  prefs: NotificationPreferences
): boolean {
  if (!shouldShowAttendanceNotification(data, prefs)) return false;
  if (isQuietHoursActive(prefs)) return false;
  return true;
}
