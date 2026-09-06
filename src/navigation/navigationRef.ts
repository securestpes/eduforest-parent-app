import { createNavigationContainerRef } from '@react-navigation/native';
import type { RootStackParamList } from './Navigation';
import type { ChildChipAction } from '../components/ChildActionChips';
import { useSelectionStore } from '../store/selectionStore';
import { resetLocalBadgeCount } from '../services/localNotificationBadge';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

export type ChildHubSection = Extract<
  ChildChipAction,
  | 'attendance'
  | 'notifications'
  | 'homework'
  | 'calendar'
  | 'fees'
  | 'exams'
  | 'leaves'
>;

export type ChildNavigationPayload = {
  section: ChildHubSection;
  studentId?: number;
  highlightAttendanceId?: number;
  highlightSessionDate?: string;
  openedFromNotification?: boolean;
};

export type BusTrackingNavigationPayload = {
  kind: 'bus_tracking';
  studentId?: number;
  busId?: number;
};

export type NotificationNavPayload =
  | ChildNavigationPayload
  | BusTrackingNavigationPayload;

let pendingNavigation: NotificationNavPayload | null = null;

function applyStudentId(studentId?: number) {
  if (studentId != null && Number.isFinite(studentId)) {
    useSelectionStore.getState().setSelectedStudentId(studentId);
  }
}

let childHubOpenHandler: ((payload: ChildNavigationPayload) => void) | null =
  null;

export function registerChildHubOpenHandler(
  handler: (payload: ChildNavigationPayload) => void
): void {
  childHubOpenHandler = handler;
}

export function unregisterChildHubOpenHandler(): void {
  childHubOpenHandler = null;
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

  const onChildHub = navigationRef.getCurrentRoute()?.name === 'ChildHub';

  if (payload.section === 'notifications') {
    navigationRef.navigate('ChildHub', {
      studentId: payload.studentId,
      section: 'notifications',
    });
    return;
  }

  if (onChildHub && childHubOpenHandler) {
    childHubOpenHandler(payload);
    return;
  }

  navigationRef.navigate('ChildHub', {
    studentId: payload.studentId,
    section: payload.section,
    highlightAttendanceId: payload.highlightAttendanceId,
    highlightSessionDate: payload.highlightSessionDate,
    openedFromNotification: payload.openedFromNotification,
  });
}

export function navigateToBusTracking(payload: {
  studentId?: number;
  busId?: number;
}): void {
  applyStudentId(payload.studentId);
  if (!navigationRef.isReady()) {
    pendingNavigation = { kind: 'bus_tracking', ...payload };
    return;
  }
  navigationRef.navigate('BusTrackingMap', {
    studentId: payload.studentId,
    busId: payload.busId,
  });
}

export function flushPendingChildNavigation(): void {
  if (pendingNavigation && navigationRef.isReady()) {
    const payload = pendingNavigation;
    pendingNavigation = null;
    if ('kind' in payload && payload.kind === 'bus_tracking') {
      navigateToBusTracking(payload);
    } else {
      navigateToChildScreen(payload as ChildNavigationPayload);
    }
  }
}

export function parseNotificationNavigation(
  data: Record<string, string> | undefined
): NotificationNavPayload | null {
  if (!data) return null;

  const studentIdRaw = data.studentId ?? data.student_id ?? data.child_id;
  const studentId = studentIdRaw ? Number(studentIdRaw) : undefined;
  const busIdRaw = data.busId ?? data.bus_id;
  const busId = busIdRaw ? Number(busIdRaw) : undefined;

  if ((data.type ?? '').toLowerCase() === 'bus_alert') {
    return {
      kind: 'bus_tracking',
      studentId: Number.isFinite(studentId) ? studentId : undefined,
      busId: Number.isFinite(busId) ? busId : undefined,
    };
  }

  const type = (data.type ?? '').toLowerCase();
  if (type === 'fee_payment' || type === 'fee_reminder') {
    return {
      section: 'fees',
      studentId: Number.isFinite(studentId) ? studentId : undefined,
      openedFromNotification: true,
    };
  }

  if (type === 'exam_results_published') {
    return {
      section: 'exams',
      studentId: Number.isFinite(studentId) ? studentId : undefined,
      openedFromNotification: true,
    };
  }

  if (type === 'leave_request_status') {
    return {
      section: 'leaves',
      studentId: Number.isFinite(studentId) ? studentId : undefined,
      openedFromNotification: true,
    };
  }

  if (type === 'homework_assigned') {
    return {
      section: 'homework',
      studentId: Number.isFinite(studentId) ? studentId : undefined,
      openedFromNotification: true,
    };
  }

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
    openedFromNotification: section !== 'notifications',
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
  tab: 'Home' | 'Attendance' | 'Calendar' | 'Fees' | 'Settings' | 'More' | 'Profile';
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
