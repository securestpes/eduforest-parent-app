import { createNavigationContainerRef } from '@react-navigation/native';
import type { RootStackParamList } from './Navigation';
import type { ChildChipAction } from '../components/ChildActionChips';
import { useSelectionStore } from '../store/selectionStore';
import { resetLocalBadgeCount } from '../services/localNotificationBadge';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

export type ChildHubSection = Extract<
  ChildChipAction,
  'attendance' | 'notifications' | 'schedule'
>;

export type ChildNavigationPayload = {
  section: ChildHubSection;
  studentId?: number;
  highlightAttendanceId?: number;
  highlightSessionDate?: string;
};

let pendingNavigation: ChildNavigationPayload | null = null;

function applyStudentId(studentId?: number) {
  if (studentId != null && Number.isFinite(studentId)) {
    useSelectionStore.getState().setSelectedStudentId(studentId);
  }
}

export function navigateToChildScreen(payload: ChildNavigationPayload): void {
  applyStudentId(payload.studentId);

  if (payload.section === 'notifications') {
    void resetLocalBadgeCount();
  }

  if (!navigationRef.isReady()) {
    pendingNavigation = payload;
    return;
  }

  navigationRef.navigate('ChildHub', {
    studentId: payload.studentId,
    section: payload.section,
    highlightAttendanceId: payload.highlightAttendanceId,
    highlightSessionDate: payload.highlightSessionDate,
  });
}

export function flushPendingChildNavigation(): void {
  if (pendingNavigation && navigationRef.isReady()) {
    const payload = pendingNavigation;
    pendingNavigation = null;
    navigateToChildScreen(payload);
  }
}

export function parseNotificationNavigation(
  data: Record<string, string> | undefined
): ChildNavigationPayload | null {
  if (!data) return null;
  const studentIdRaw = data.studentId ?? data.student_id ?? data.child_id;
  const studentId = studentIdRaw ? Number(studentIdRaw) : undefined;
  const attendanceIdRaw = data.attendanceId ?? data.attendance_id;
  const attendanceId = attendanceIdRaw ? Number(attendanceIdRaw) : undefined;
  const sessionDate = data.sessionDate ?? data.session_date;
  const section: ChildHubSection =
    data.type === 'attendance_marked' || data.attendanceId || data.sessionDate
      ? 'attendance'
      : 'notifications';
  return {
    section,
    studentId: Number.isFinite(studentId) ? studentId : undefined,
    highlightAttendanceId: Number.isFinite(attendanceId)
      ? attendanceId
      : undefined,
    highlightSessionDate: sessionDate?.trim() || undefined,
  };
}

/** @deprecated use navigateToChildScreen */
export function navigateFromNotification(
  payload: ChildNavigationPayload
): void {
  navigateToChildScreen(payload);
}

/** Tab handler kept for Home / Profile only */
export type TabNavigationPayload = {
  tab: 'Home' | 'Schedule' | 'Profile';
  studentId?: number;
};

let tabNavigateHandler: ((payload: TabNavigationPayload) => void) | null = null;

export function registerTabNavigateHandler(
  handler: (payload: TabNavigationPayload) => void
): void {
  tabNavigateHandler = handler;
}

export function unregisterTabNavigateHandler(): void {
  tabNavigateHandler = null;
}

export function navigateToTab(payload: TabNavigationPayload): void {
  applyStudentId(payload.studentId);
  if (tabNavigateHandler) {
    tabNavigateHandler(payload);
  }
}
