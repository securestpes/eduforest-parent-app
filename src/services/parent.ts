import { api, type ApiEnvelope } from './api';

const prefix = '/clients/parent';

export interface ParentStudent {
  id: number;
  name: string;
  guardianName: string;
  batchNames: string[];
  instituteName: string;
}

export interface ParentAttendanceRow {
  attendanceId: number;
  status: string;
  sessionDate: string;
  startTime: string;
  endTime: string;
  batchName: string;
}

export interface ParentSchedule {
  scheduleId: number;
  batchId: number;
  batchName: string;
  scheduleType: string;
  startTime: string;
  endTime: string;
  endDate: string;
  daysOfWeek: string[];
  specificDates: string[];
}

export interface PageAttendance {
  content: ParentAttendanceRow[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export async function getMe(): Promise<ApiEnvelope> {
  const { data } = await api.get<ApiEnvelope>(`${prefix}/me`);
  return data;
}

/** Soft-deletes the parent account on the server (sets {@code is_active} false, deactivates FCM tokens). */
export async function deleteMyAccount(): Promise<ApiEnvelope> {
  const { data } = await api.delete<ApiEnvelope>(`${prefix}/me`);
  return data;
}

export async function getMyStudents(): Promise<
  ApiEnvelope & { data?: ParentStudent[] }
> {
  const { data } = await api.get(`${prefix}/me/students`);
  return data as ApiEnvelope & { data?: ParentStudent[] };
}

export async function getStudentAttendance(
  studentId: number,
  page = 0,
  size = 25
): Promise<ApiEnvelope & { data?: PageAttendance }> {
  const { data } = await api.get(`${prefix}/students/${studentId}/attendance`, {
    params: { page, size, sort: 'session.date,desc' },
  });
  return data as ApiEnvelope & { data?: PageAttendance };
}

export async function getStudentSchedules(
  studentId: number
): Promise<ApiEnvelope & { data?: ParentSchedule[] }> {
  const { data } = await api.get(`${prefix}/students/${studentId}/schedules`);
  return data as ApiEnvelope & { data?: ParentSchedule[] };
}

export async function registerDeviceToken(
  fcmToken: string,
  platform: string,
  accessToken?: string | null
): Promise<ApiEnvelope> {
  const { data } = await api.post<ApiEnvelope>(
    `${prefix}/device-token`,
    { token: fcmToken, platform },
    accessToken
      ? { headers: { Authorization: `Bearer ${accessToken}` } }
      : undefined
  );
  return data;
}

export async function getNotificationReads(): Promise<Set<string>> {
  const { data } = await api.get<ApiEnvelope>(`${prefix}/me/notification-reads`);
  const body = data?.data as { readIds?: string[] } | undefined;
  const ids = body?.readIds ?? [];
  return new Set(ids.filter((x): x is string => typeof x === 'string'));
}

export async function mergeNotificationReads(readIds: string[]): Promise<ApiEnvelope> {
  const { data } = await api.post<ApiEnvelope>(`${prefix}/me/notification-reads`, { readIds });
  return data;
}
