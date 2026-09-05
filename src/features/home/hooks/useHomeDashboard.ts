import { useCallback, useEffect, useMemo, useState } from 'react';
import { format, isBefore, startOfDay } from 'date-fns';
import {
  getMe,
  getMyStudents,
  getStudentAttendance,
  getStudentExams,
  getStudentFees,
  getStudentHomework,
  getStudentLeaves,
  getStudentSchoolCalendar,
  PARENT_ATTENDANCE_PAGE_SIZE,
  type ParentCalendarEvent,
  type ParentStudent,
} from '../../../services/parent';
import { getParentChildrenBuses, type ParentChildBus } from '../../../services/transport';
import { useSelectionStore } from '../../../store/selectionStore';
import { useUnreadNotificationCount } from '../../../common/hooks/useUnreadNotificationCount';
import { resolveHomeworkStatus } from '../../homework/utils/homeworkStatus';
import {
  countHolidaysThisMonth,
  countUpcomingByType,
  firstName,
  formatInr,
  monthAttendancePct,
  safeParseDate,
  upcomingCalendarEvents,
} from '../utils/homeMetrics';

export function useHomeDashboard() {
  const unreadCount = useUnreadNotificationCount();
  const selectedStudentId = useSelectionStore((s) => s.selectedStudentId);
  const setSelected = useSelectionStore((s) => s.setSelectedStudentId);
  const hydrated = useSelectionStore((s) => s.hydrated);

  const [students, setStudents] = useState<ParentStudent[]>([]);
  const [parentLabel, setParentLabel] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(false);

  const [attendancePct, setAttendancePct] = useState<number | null>(null);
  const [feeDue, setFeeDue] = useState<number | null>(null);
  const [nextDueDate, setNextDueDate] = useState<string | null>(null);
  const [pendingHomework, setPendingHomework] = useState<number | null>(null);
  const [nextExamLabel, setNextExamLabel] = useState<string | null>(null);
  const [nextExamDate, setNextExamDate] = useState<string | null>(null);
  const [hasExam, setHasExam] = useState(false);
  const [pendingLeaves, setPendingLeaves] = useState<number | null>(null);
  const [className, setClassName] = useState<string | null>(null);
  const [sectionName, setSectionName] = useState<string | null>(null);
  const [bus, setBus] = useState<ParentChildBus | null>(null);
  const [upcomingEvents, setUpcomingEvents] = useState<ParentCalendarEvent[]>([]);
  const [upcomingEventCount, setUpcomingEventCount] = useState(0);
  const [holidaysThisMonth, setHolidaysThisMonth] = useState(0);

  const student =
    students.find((s) => s.id === selectedStudentId) ?? students[0] ?? null;

  const loadStudents = useCallback(async () => {
    setError(null);
    try {
      try {
        const meRes = await getMe();
        if (meRes.status && meRes.data && typeof meRes.data === 'object') {
          const d = meRes.data as { firstName?: string };
          if (d.firstName) setParentLabel(d.firstName);
        }
      } catch {
        /* optional */
      }

      const stRes = await getMyStudents();
      if (!stRes.status || !Array.isArray(stRes.data)) {
        setStudents([]);
        setError(stRes.message || 'Could not load students.');
        return;
      }
      const list = stRes.data;
      setStudents(list);
      const current = useSelectionStore.getState().selectedStudentId;
      const stillValid = current != null && list.some((s) => s.id === current);
      if (!stillValid && list[0]) setSelected(list[0].id);
    } catch {
      setError('Network error.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [setSelected]);

  const loadOverview = useCallback(async (studentId: number) => {
    setOverviewLoading(true);
    try {
      const [attRes, feeRes, hwRes, examRes, leaveRes, busesRes, calRes] =
        await Promise.all([
          getStudentAttendance(studentId, 0, PARENT_ATTENDANCE_PAGE_SIZE).catch(() => null),
          getStudentFees(studentId).catch(() => null),
          getStudentHomework(studentId).catch(() => null),
          getStudentExams(studentId).catch(() => null),
          getStudentLeaves(studentId).catch(() => null),
          getParentChildrenBuses().catch(() => null),
          getStudentSchoolCalendar(studentId).catch(() => null),
        ]);

      const rows = attRes?.status && attRes.data?.content ? attRes.data.content : [];
      setAttendancePct(monthAttendancePct(rows));

      if (feeRes?.status && feeRes.data) {
        setFeeDue(feeRes.data.totalDue ?? 0);
        setNextDueDate(feeRes.data.nextDueDate ?? null);
      } else {
        setFeeDue(null);
        setNextDueDate(null);
      }

      const homeworks = hwRes?.status ? hwRes.data?.homeworks ?? [] : [];
      setClassName(hwRes?.data?.className ?? null);
      setSectionName(hwRes?.data?.sectionName ?? null);
      setPendingHomework(homeworks.filter((h) => resolveHomeworkStatus(h) === 'pending').length);

      const today = startOfDay(new Date());
      const exams = examRes?.status ? examRes.data?.exams ?? [] : [];
      setHasExam(exams.length > 0);
      const upcomingExam = exams
        .map((e) => ({
          e,
          d: safeParseDate(e.nextPaperDate || e.startDate),
        }))
        .filter((x) => x.d && !isBefore(x.d, today))
        .sort((a, b) => a.d!.getTime() - b.d!.getTime())[0];
      setNextExamLabel(upcomingExam?.e.name ?? exams[0]?.name ?? null);
      setNextExamDate(
        upcomingExam?.d
          ? format(upcomingExam.d, 'd MMM')
          : exams.length > 0
            ? String(exams.length)
            : null
      );

      const leaves = leaveRes?.status ? leaveRes.data?.leaves ?? [] : [];
      setPendingLeaves(
        leaves.filter((item) => (item.status || '').toUpperCase().includes('PEND')).length
      );

      const buses: ParentChildBus[] =
        busesRes?.status && Array.isArray(busesRes.data) ? busesRes.data : [];
      setBus(buses.find((b) => b.studentId === studentId) ?? null);

      const events: ParentCalendarEvent[] = calRes?.status ? calRes.data?.events ?? [] : [];
      setUpcomingEvents(upcomingCalendarEvents(events, 3));
      setUpcomingEventCount(countUpcomingByType(events, 'EVENT'));
      setHolidaysThisMonth(countHolidaysThisMonth(events));
    } finally {
      setOverviewLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    void loadStudents();
  }, [hydrated, loadStudents]);

  useEffect(() => {
    if (!student) return;
    void loadOverview(student.id);
  }, [student?.id, loadOverview]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await loadStudents();
    if (student) await loadOverview(student.id);
    setRefreshing(false);
  }, [loadStudents, loadOverview, student]);

  const greetingHour = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return 'morning' as const;
    if (h < 17) return 'afternoon' as const;
    return 'evening' as const;
  }, []);

  const feeMetric = feeDue == null ? '—' : formatInr(feeDue);
  const feeSub =
    feeDue != null && feeDue > 0 && nextDueDate
      ? nextDueDate
      : null;

  return {
    students,
    student,
    parentLabel,
    greetingHour,
    firstName: firstName(student?.name),
    className,
    sectionName,
    loading: loading || !hydrated,
    refreshing,
    overviewLoading,
    error,
    attendancePct,
    feeMetric,
    feeSub,
    pendingHomework,
    pendingLeaves,
    hasExam,
    nextExamLabel,
    nextExamDate,
    bus,
    unreadCount,
    upcomingEvents,
    upcomingEventCount,
    holidaysThisMonth,
    setSelected,
    refresh,
  };
}
