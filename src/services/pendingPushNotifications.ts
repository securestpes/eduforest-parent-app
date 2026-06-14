import { DeviceEventEmitter } from 'react-native';
import { APP_NOTIFICATION_RECEIVED_EVENT } from '../constants/notifications';
import { notificationKeyFromFcm } from '../utils/notificationKeys';
import { incrementLocalBadgeFromPush } from './localNotificationBadge';

export function normalizeFcmData(
  data: Record<string, string | object> | undefined
): Record<string, string> | undefined {
  if (!data) return undefined;
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'string') out[key] = value;
    else if (value != null) out[key] = String(value);
  }
  return out;
}

/** Stable id from FCM when possible; temporary fallback before API catches up. */
export function pushNotificationIdFromFcm(data: Record<string, string>): string {
  const stable = notificationKeyFromFcm(data);
  if (stable) return stable;

  const studentId = data.studentId ?? data.student_id ?? data.child_id ?? '0';
  const sessionDate = data.sessionDate ?? data.session_date ?? '';
  const timestamp = data.timestamp ?? String(Date.now());
  return `push-${studentId}-${sessionDate}-${timestamp}`;
}

/** Call when FCM delivers a message (foreground or background JS handler). */
export function handleIncomingPushNotification(
  data: Record<string, string | object> | undefined
): void {
  const normalized = normalizeFcmData(data);
  if (normalized) {
    const id = pushNotificationIdFromFcm(normalized);
    void incrementLocalBadgeFromPush(id);
  }
  DeviceEventEmitter.emit(APP_NOTIFICATION_RECEIVED_EVENT, normalized);
}
