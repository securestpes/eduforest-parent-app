import { api, type ApiEnvelope } from './api';

const prefix = '/clients/parent';

export interface ParentStudent {
  id: number;
  name: string;
  guardianName: string;
  batchNames: string[];
  instituteName: string;
  instituteLogo?: string | null;
  dateOfBirth?: string | null;
  profilePicUrl?: string | null;
  className?: string | null;
  sectionName?: string | null;
  rollNumber?: string | null;
  academicYear?: string | null;
  status?: string | null;
}

export interface ParentAttendanceRow {
  attendanceId: number;
  status: string;
  sessionDate: string;
  startTime: string;
  endTime: string;
  batchName: string;
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

function pickStr(...vals: unknown[]): string {
  for (const v of vals) {
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return '';
}

function mapParentStudent(raw: unknown): ParentStudent {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const batches = r.batchNames;
  return {
    id: Number(r.id ?? 0),
    name: pickStr(r.name) || 'Student',
    guardianName: pickStr(r.guardianName, r.guardian_name),
    batchNames: Array.isArray(batches)
      ? batches.map((b) => String(b)).filter(Boolean)
      : [],
    instituteName: pickStr(r.instituteName, r.institute_name),
    instituteLogo: pickStr(r.instituteLogo, r.institute_logo) || null,
    dateOfBirth: pickStr(r.dateOfBirth, r.date_of_birth) || null,
    profilePicUrl:
      pickStr(r.profilePicUrl, r.profile_pic_url, r.photoUrl, r.photo) || null,
    className: pickStr(r.className, r.class_name) || null,
    sectionName: pickStr(r.sectionName, r.section_name) || null,
    rollNumber: pickStr(r.rollNumber, r.roll_number) || null,
    academicYear: pickStr(r.academicYear, r.academic_year) || null,
    status: pickStr(r.status) || null,
  };
}

export async function getMyStudents(): Promise<
  ApiEnvelope & { data?: ParentStudent[] }
> {
  const { data } = await api.get(`${prefix}/me/students`);
  const envelope = data as ApiEnvelope & { data?: unknown };
  if (Array.isArray(envelope.data)) {
    return { ...envelope, data: envelope.data.map(mapParentStudent) };
  }
  return envelope as ApiEnvelope & { data?: ParentStudent[] };
}

export type ParentFeeNotificationType =
  | 'fee_payment'
  | 'fee_reminder'
  | 'exam_results_published'
  | 'leave_request_status'
  | 'homework_assigned';

export interface ParentFeeNotification {
  id: string;
  type: ParentFeeNotificationType | string;
  studentId: number;
  studentName: string;
  title: string;
  body: string;
  amount?: string | null;
  createdAt?: string | null;
}

export async function getFeeNotifications(): Promise<
  ApiEnvelope & { data?: ParentFeeNotification[] }
> {
  try {
    const { data } = await api.get(`${prefix}/me/fee-notifications`);
    return data as ApiEnvelope & { data?: ParentFeeNotification[] };
  } catch {
    return {
      status: false,
      message: 'Could not load fee notifications',
      data: [],
    };
  }
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

export interface ParentExamListItem {
  examId: number;
  name: string;
  examType?: string | null;
  customTypeLabel?: string | null;
  status: string;
  startDate: string;
  endDate: string;
  passPercent: number;
  gradeEnabled: boolean;
  divisionDisplayName?: string | null;
  subjectCount: number;
  scoredSubjects: number;
  pendingSubjects: number;
  releasedSubjects?: number;
  partialResults?: boolean;
  obtainedMarks?: number | null;
  maxMarks?: number | null;
  percent?: number | null;
  passed?: boolean | null;
  grade?: string | null;
  resultLabel?: string | null;
}

export interface ParentExamSubjectRow {
  paperId: number;
  subjectName: string;
  maxMarks: number;
  examDate?: string | null;
  marks?: number | null;
  attendanceStatus?: string | null;
  remark?: string | null;
  entered: boolean;
  awaiting?: boolean;
  released?: boolean;
  paperStatus?: string | null;
}

export interface ParentExamDetail extends ParentExamListItem {
  sessionName?: string | null;
  subjects: ParentExamSubjectRow[];
}

export interface ParentExamListResponse {
  studentId: number;
  exams: ParentExamListItem[];
}

export async function getStudentExams(
  studentId: number
): Promise<ApiEnvelope & { data?: ParentExamListResponse }> {
  const { data } = await api.get(`${prefix}/students/${studentId}/exams`);
  return data as ApiEnvelope & { data?: ParentExamListResponse };
}

export async function getStudentExamDetail(
  studentId: number,
  examId: number
): Promise<ApiEnvelope & { data?: ParentExamDetail }> {
  const { data } = await api.get(
    `${prefix}/students/${studentId}/exams/${examId}`
  );
  return data as ApiEnvelope & { data?: ParentExamDetail };
}

export interface ParentExamReportCardFile {
  fileName: string;
  mimeType: string;
  contentBase64: string;
}

export async function getStudentExamReportCard(
  studentId: number,
  examId: number
): Promise<ApiEnvelope & { data?: ParentExamReportCardFile }> {
  const { data } = await api.get(
    `${prefix}/students/${studentId}/exams/${examId}/report-card`
  );
  return data as ApiEnvelope & { data?: ParentExamReportCardFile };
}

export interface ParentLeaveItem {
  id: number;
  studentId: number;
  status: string;
  leaveType: string;
  fromDate: string;
  fromSession?: string | null;
  toDate: string;
  toSession?: string | null;
  reason: string;
  reviewNote?: string | null;
  reviewedAt?: string | null;
  reviewedByName?: string | null;
  reviewedByRole?: string | null;
  reviewedByRoleLabel?: string | null;
  createdAt?: string | null;
  canCancel?: boolean;
  divisionDisplayName?: string | null;
}

export interface ParentLeaveListResponse {
  studentId: number;
  leaves: ParentLeaveItem[];
}

export async function getStudentLeaves(
  studentId: number
): Promise<ApiEnvelope & { data?: ParentLeaveListResponse }> {
  const { data } = await api.get(`${prefix}/students/${studentId}/leaves`);
  return data as ApiEnvelope & { data?: ParentLeaveListResponse };
}

export async function applyStudentLeave(
  studentId: number,
  payload: {
    fromDate: string;
    fromSession?: string;
    toDate: string;
    toSession?: string;
    leaveType: string;
    reason: string;
  }
): Promise<ApiEnvelope & { data?: ParentLeaveItem }> {
  const { data } = await api.post(
    `${prefix}/students/${studentId}/leaves`,
    payload
  );
  return data as ApiEnvelope & { data?: ParentLeaveItem };
}

export async function cancelStudentLeave(
  studentId: number,
  leaveId: number
): Promise<ApiEnvelope & { data?: ParentLeaveItem }> {
  const { data } = await api.post(
    `${prefix}/students/${studentId}/leaves/${leaveId}/cancel`
  );
  return data as ApiEnvelope & { data?: ParentLeaveItem };
}

export type ParentCalendarEventType = 'HOLIDAY' | 'EXAM' | 'EVENT' | string;

export interface ParentCalendarEvent {
  id: number;
  title: string;
  eventType: ParentCalendarEventType | null;
  startDate: string | null;
  endDate: string | null;
  description: string | null;
  defaultEvent: boolean;
}

export interface ParentSchoolCalendar {
  studentId: number;
  sessionId: number | null;
  sessionName: string | null;
  startDate: string | null;
  endDate: string | null;
  events: ParentCalendarEvent[];
}

export async function getStudentSchoolCalendar(
  studentId: number
): Promise<ApiEnvelope & { data?: ParentSchoolCalendar }> {
  const { data } = await api.get(`${prefix}/students/${studentId}/calendar`);
  return data as ApiEnvelope & { data?: ParentSchoolCalendar };
}

export interface ParentBatchSchedule {
  scheduleId: number;
  batchId: number | null;
  batchName: string;
  scheduleType: string;
  startTime: string;
  endTime: string;
  endDate: string;
  daysOfWeek: string[];
  specificDates: string[];
  periodName?: string;
  teacherName?: string;
  source?: 'BATCH' | 'TIMETABLE' | string;
}

export async function getStudentSchedules(
  studentId: number
): Promise<ApiEnvelope & { data?: ParentBatchSchedule[] }> {
  const { data } = await api.get(`${prefix}/students/${studentId}/schedules`);
  return data as ApiEnvelope & { data?: ParentBatchSchedule[] };
}

export interface ParentFeeInstallment {
  key: string;
  label: string;
  yearValue: number;
  monthValue: number;
  dueDate: string;
  amount: number;
  paidAmount: number;
  balance: number;
  status: string;
  statusLabel?: string;
  overdue?: boolean;
  collectible?: boolean;
  collectedAt?: string | null;
  collectedDate?: string | null;
  lastPaymentMode?: string | null;
  lastReceiptNo?: string | null;
  heads: Array<{
    demandId: number;
    feeHeadId: number;
    feeHeadName: string;
    amount: number;
    paidAmount: number;
    balance: number;
    status: string;
  }>;
}

export interface ParentFeePayment {
  paymentId: number;
  amount: number;
  paymentMode?: string | null;
  referenceNo?: string | null;
  remark?: string | null;
  paidAt?: string | null;
  receiptId?: number;
  receiptNo?: string;
}

export interface ParentFeeLedger {
  studentId: number;
  studentName?: string;
  sessionId: number | null;
  sessionName?: string | null;
  totalAmount: number;
  totalPaid: number;
  totalDue: number;
  nextDueDate?: string | null;
  hasAssignment?: boolean;
  dueBreakdown?: Array<{
    feeHeadId?: number;
    feeHeadName: string;
    amount: number;
  }>;
  installments: ParentFeeInstallment[];
  payments: ParentFeePayment[];
}

export async function getStudentFees(
  studentId: number
): Promise<ApiEnvelope & { data?: ParentFeeLedger }> {
  try {
    const { data } = await api.get(`${prefix}/students/${studentId}/fees`);
    return data as ApiEnvelope & { data?: ParentFeeLedger };
  } catch (e: any) {
    const serverMessage =
      e?.response?.data?.message ||
      e?.response?.data?.error ||
      e?.message ||
      'Could not load fees';
    throw new Error(serverMessage);
  }
}

export async function getStudentFeeReceipt(
  studentId: number,
  receiptId: number
): Promise<ApiEnvelope & { data?: Record<string, unknown> }> {
  const { data } = await api.get(
    `${prefix}/students/${studentId}/fees/receipts/${receiptId}`
  );
  return data as ApiEnvelope & { data?: Record<string, unknown> };
}

export async function getStudentFeeReceiptPdf(
  studentId: number,
  receiptId: number
): Promise<
  ApiEnvelope & {
    data?: { fileName: string; mimeType: string; contentBase64: string };
  }
> {
  const { data } = await api.get(
    `${prefix}/students/${studentId}/fees/receipts/${receiptId}/pdf`
  );
  return data as ApiEnvelope & {
    data?: { fileName: string; mimeType: string; contentBase64: string };
  };
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
