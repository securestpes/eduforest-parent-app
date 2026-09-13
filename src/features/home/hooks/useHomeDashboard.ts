import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { payableFeeSummary } from '../../../utils/feeDueBreakdown';
import type { TranslationKey } from '../../../common';

export type HomeExamSnapshot = {
  name: string;
  dateLabel: string | null;
};

export type HomeResultSnapshot = {
  name: string;
  percent: number | null;
  partial: boolean;
};

export function useHomeDashboard(isActive = true) {
  const unreadCount = useUnreadNotificationCount();
  const selectedStudentId = useSelectionStore((s) => s.selectedStudentId);
  const setSelected = useSelectionStore((s) => s.setSelectedStudentId);
  const hydrated = useSelectionStore((s) => s.hydrated);

  const [students, setStudents] = useState<ParentStudent[]>([]);
  const [parentLabel, setParentLabel] = useState('');
  const [parentSchoolName, setParentSchoolName] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(true);

  const [attendancePct, setAttendancePct] = useState<number | null>(null);
  const [feeDue, setFeeDue] = useState<number | null>(null);
  const [feeSubKey, setFeeSubKey] = useState<TranslationKey>('home.statsThisMonth');
  const [pendingHomework, setPendingHomework] = useState<number | null>(null);
  const [nextExam, setNextExam] = useState<HomeExamSnapshot | null>(null);
  const [latestResult, setLatestResult] = useState<HomeResultSnapshot | null>(null);
  const [hasAnyExams, setHasAnyExams] = useState(false);
  const [pendingLeaves, setPendingLeaves] = useState<number | null>(null);
  const [className, setClassName] = useState<string | null>(null);
  const [sectionName, setSectionName] = useState<string | null>(null);
  const [bus, setBus] = useState<ParentChildBus | null>(null);
  const [upcomingEvents, setUpcomingEvents] = useState<ParentCalendarEvent[]>([]);
  const [upcomingEventCount, setUpcomingEventCount] = useState(0);
  const [holidaysThisMonth, setHolidaysThisMonth] = useState(0);
  const overviewRequestRef = useRef(0);
  const lastOverviewStudentId = useRef<number | null>(null);

  const student =
    students.find((s) => s.id === selectedStudentId) ?? students[0] ?? null;

  const loadStudents = useCallback(async () => {
    setError(null);
    try {
      try {
        const meRes = await getMe();
        if (meRes.status && meRes.data && typeof meRes.data === 'object') {
          const d = meRes.data as {
            firstName?: string;
            clientName?: string;
            instituteName?: string;
            schoolName?: string;
          };
          if (d.firstName) setParentLabel(d.firstName);
          const school =
            (typeof d.instituteName === 'string' && d.instituteName.trim()) ||
            (typeof d.clientName === 'string' && d.clientName.trim()) ||
            (typeof d.schoolName === 'string' && d.schoolName.trim()) ||
            '';
          if (school) setParentSchoolName(school);
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

  const selectStudent = useCallback(
    (id: number | null) => {
      const current = useSelectionStore.getState().selectedStudentId;
      if (id != null && id !== current) {
        setOverviewLoading(true);
      }
      setSelected(id);
    },
    [setSelected]
  );

  const loadOverview = useCallback(async (studentId: number, silent = false) => {
    const requestId = overviewRequestRef.current + 1;
    overviewRequestRef.current = requestId;
    if (!silent) setOverviewLoading(true);
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

      if (requestId !== overviewRequestRef.current) return;

      const rows = attRes?.status && attRes.data?.content ? attRes.data.content : [];
      setAttendancePct(monthAttendancePct(rows));

      if (feeRes?.status && feeRes.data) {
        const summary = payableFeeSummary(feeRes.data);
        setFeeDue(summary.pending);
        if (summary.pending <= 0) {
          setFeeSubKey('dashboard.feesClearSub');
        } else if (summary.overdue > 0 && summary.dueThisMonth <= 0) {
          setFeeSubKey('fees.sectionOverdue');
        } else if (summary.overdue > 0) {
          setFeeSubKey('fees.totalOutstanding');
        } else {
          setFeeSubKey('fees.sectionDueThisMonth');
        }
      } else {
        setFeeDue(null);
        setFeeSubKey('home.statsThisMonth');
      }

      const homeworks = hwRes?.status ? hwRes.data?.homeworks ?? [] : [];
      setClassName(hwRes?.data?.className ?? null);
      setSectionName(hwRes?.data?.sectionName ?? null);
      setPendingHomework(homeworks.filter((h) => resolveHomeworkStatus(h) === 'pending').length);

      const today = startOfDay(new Date());
      const exams = examRes?.status ? examRes.data?.exams ?? [] : [];
      setHasAnyExams(exams.length > 0);
      const upcomingExam = exams
        .map((e) => ({
          e,
          d: safeParseDate(e.nextPaperDate || e.startDate),
        }))
        .filter((x) => x.d && !isBefore(x.d, today))
        .sort((a, b) => a.d!.getTime() - b.d!.getTime())[0];
      setNextExam(
        upcomingExam
          ? {
              name: upcomingExam.e.name,
              dateLabel: upcomingExam.d ? format(upcomingExam.d, 'd MMM') : null,
            }
          : null
      );
      const published = [...exams]
        .filter(
          (item) =>
            Boolean(item.resultsReady) &&
            (item.percent != null || item.partialResults)
        )
        .sort((a, b) => String(b.endDate).localeCompare(String(a.endDate)))[0];
      setLatestResult(
        published
          ? {
              name: published.name,
              percent: published.percent ?? null,
              partial: Boolean(published.partialResults),
            }
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
      if (requestId === overviewRequestRef.current) {
        lastOverviewStudentId.current = studentId;
        setOverviewLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!hydrated || !isActive) return;
    void loadStudents();
  }, [hydrated, isActive, loadStudents]);

  useEffect(() => {
    if (!student || !isActive) return;
    const silent = lastOverviewStudentId.current === student.id;
    void loadOverview(student.id, silent);
  }, [student?.id, isActive, loadOverview]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await loadStudents();
    const id = useSelectionStore.getState().selectedStudentId ?? student?.id;
    if (id != null) await loadOverview(id, true);
    setRefreshing(false);
  }, [loadStudents, loadOverview, student?.id]);

  const greetingHour = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return 'morning' as const;
    if (h < 17) return 'afternoon' as const;
    return 'evening' as const;
  }, []);

  const feeMetric = feeDue == null ? '—' : formatInr(feeDue);

  return {
    students,
    student,
    parentLabel,
    parentSchoolName,
    greetingHour,
    firstName: firstName(student?.name),
    className,
    sectionName,
    loading: loading || !hydrated,
    refreshing,
    overviewLoading,
    error,
    attendancePct,
    feeDue,
    feeMetric,
    feeSubKey,
    pendingHomework,
    pendingLeaves,
    nextExam,
    latestResult,
    hasAnyExams,
    bus,
    unreadCount,
    upcomingEvents,
    upcomingEventCount,
    holidaysThisMonth,
    setSelected: selectStudent,
    refresh,
  };
}
