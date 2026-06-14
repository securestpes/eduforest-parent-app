/** Stable push ids from FCM data (e.g. cn-123 from attendanceId). */
export const NotificationKeyPrefix = {
  attendance: 'cn',
} as const;

const STABLE_KEY = /^[a-z]{2,12}-\d+$/;

export function attendanceNotificationKey(attendanceId: number): string {
  return `${NotificationKeyPrefix.attendance}-${attendanceId}`;
}

export function notificationKeyFromFcm(data: Record<string, string> | undefined): string | null {
  if (!data) return null;
  const explicit = data.notificationKey?.trim();
  if (explicit && STABLE_KEY.test(explicit)) return explicit;
  const attendanceRaw = data.attendanceId ?? data.attendance_id;
  if (attendanceRaw) {
    const id = Number(attendanceRaw);
    if (Number.isFinite(id) && id > 0) return attendanceNotificationKey(id);
  }
  return null;
}
