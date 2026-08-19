/** Stable push ids from FCM data (e.g. cn-123 from attendanceId, fee-45 from payment). */
export const NotificationKeyPrefix = {
  attendance: 'cn',
  fee: 'fee',
} as const;

const STABLE_KEY = /^[a-z]{2,12}-\d+$/;

export function attendanceNotificationKey(attendanceId: number): string {
  return `${NotificationKeyPrefix.attendance}-${attendanceId}`;
}

export function feeNotificationKey(paymentId: number): string {
  return `${NotificationKeyPrefix.fee}-${paymentId}`;
}

export function notificationKeyFromFcm(data: Record<string, string> | undefined): string | null {
  if (!data) return null;
  const explicit = data.notificationKey?.trim();
  if (explicit && STABLE_KEY.test(explicit)) return explicit;
  const type = (data.type ?? '').toLowerCase();
  if ((type === 'bus_alert' || type === 'fee_payment' || type === 'fee_reminder' || type === 'exam_results_published' || type === 'leave_request_status' || type === 'homework_assigned') && explicit) {
    return explicit;
  }
  const attendanceRaw = data.attendanceId ?? data.attendance_id;
  if (attendanceRaw) {
    const id = Number(attendanceRaw);
    if (Number.isFinite(id) && id > 0) return attendanceNotificationKey(id);
  }
  const paymentRaw = data.paymentId ?? data.payment_id;
  if (paymentRaw) {
    const id = Number(paymentRaw);
    if (Number.isFinite(id) && id > 0) return feeNotificationKey(id);
  }
  return null;
}
