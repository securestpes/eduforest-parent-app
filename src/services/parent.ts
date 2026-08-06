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

/** Default page size for parent attendance APIs (notifications, attendance list). */
export const PARENT_ATTENDANCE_PAGE_SIZE = 25;

/** Server caps requests above this size. */
export const PARENT_ATTENDANCE_PAGE_SIZE_MAX = 100;

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
  size = PARENT_ATTENDANCE_PAGE_SIZE
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

export interface ParentHomeworkItem {
  id: number;
  title: string;
  subjectName: string | null;
  assignedBy: string | null;
  assignedDate: string | null;
  dueDate: string | null;
  hasAttachments: boolean;
  status: string | null;
}

export interface ParentHomeworkDetail extends ParentHomeworkItem {
  description: string | null;
  attachmentUrls: string[];
  className: string | null;
  sectionName: string | null;
  sessionName: string | null;
}

export interface ParentHomeworkList {
  studentId: number;
  sessionId: number | null;
  sessionName: string | null;
  className: string | null;
  sectionName: string | null;
  homeworks: ParentHomeworkItem[];
}

export async function getStudentHomework(
  studentId: number
): Promise<ApiEnvelope & { data?: ParentHomeworkList }> {
  const { data } = await api.get(`${prefix}/students/${studentId}/homework`);
  return data as ApiEnvelope & { data?: ParentHomeworkList };
}

export async function getStudentHomeworkDetail(
  studentId: number,
  homeworkId: number
): Promise<ApiEnvelope & { data?: ParentHomeworkDetail }> {
  const { data } = await api.get(
    `${prefix}/students/${studentId}/homework/${homeworkId}`
  );
  return data as ApiEnvelope & { data?: ParentHomeworkDetail };
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
