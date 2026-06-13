import { DeviceEventEmitter } from 'react-native';
import { format } from 'date-fns';
import type { ParentStudent } from '../services/parent';
import { APP_NOTIFICATION_RECEIVED_EVENT } from '../constants/notifications';
import type { CenterNotification } from '../utils/notificationCenter';
import { parseRowDate } from '../utils/dashboardHome';

export type PendingPushNotification = {
  id: string;
  studentId: number | null;
  sessionDate: string;
  receivedAt: number;
};

let pending: PendingPushNotification[] = [];

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

export function pushNotificationIdFromFcm(data: Record<string, string>): string {
  const studentId = data.studentId ?? data.student_id ?? data.child_id ?? '0';
  const sessionDate = data.sessionDate ?? data.session_date ?? '';
  const timestamp = data.timestamp ?? String(Date.now());
  return `push-${studentId}-${sessionDate}-${timestamp}`;
}

export function registerPendingPush(data: Record<string, string>): string {
  const id = pushNotificationIdFromFcm(data);
  if (!pending.some((p) => p.id === id)) {
    const studentIdRaw = data.studentId ?? data.student_id ?? data.child_id;
    const studentId = studentIdRaw ? Number(studentIdRaw) : null;
    pending.push({
      id,
      studentId: Number.isFinite(studentId) ? studentId : null,
      sessionDate: data.sessionDate ?? data.session_date ?? '',
      receivedAt: Date.now(),
    });
  }
  return id;
}

export function getPendingPushNotifications(): PendingPushNotification[] {
  return [...pending];
}

export function isPendingCoveredByApiItem(
  pendingItem: PendingPushNotification,
  items: CenterNotification[],
  students: ParentStudent[]
): boolean {
  const student =
    pendingItem.studentId != null
      ? students.find((s) => s.id === pendingItem.studentId)
      : null;
  if (!student) return false;

  return items.some((item) => {
    if (item.studentName !== student.name) return false;
    if (!pendingItem.sessionDate) return true;
    const rowDate = parseRowDate(item.row);
    if (!rowDate) return false;
    return format(rowDate, 'yyyy-MM-dd') === pendingItem.sessionDate;
  });
}

export function reconcilePendingPushNotifications(
  items: CenterNotification[],
  students: ParentStudent[]
): void {
  pending = pending.filter((p) => !isPendingCoveredByApiItem(p, items, students));
}

export function computeUnreadNotificationCount(
  items: CenterNotification[],
  readIds: Set<string>,
  students: ParentStudent[]
): number {
  reconcilePendingPushNotifications(items, students);

  const apiUnread = items.filter((n) => !readIds.has(n.id)).length;
  const pushUnread = pending.filter((p) => !readIds.has(p.id)).length;
  return apiUnread + pushUnread;
}

/** Call when FCM delivers a message (foreground or background JS handler). */
export function handleIncomingPushNotification(
  data: Record<string, string | object> | undefined
): void {
  const normalized = normalizeFcmData(data);
  if (normalized) {
    registerPendingPush(normalized);
  }
  DeviceEventEmitter.emit(APP_NOTIFICATION_RECEIVED_EVENT, normalized);
}

export function clearStalePendingPushNotifications(maxAgeMs = 7 * 24 * 60 * 60 * 1000): void {
  const cutoff = Date.now() - maxAgeMs;
  pending = pending.filter((p) => p.receivedAt >= cutoff);
}
