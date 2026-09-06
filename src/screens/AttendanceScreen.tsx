import { format, parseISO } from 'date-fns';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Text, useTheme } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import {
  getMyStudents,
  getStudentAttendance,
  getStudentSchoolCalendar,
  PARENT_ATTENDANCE_PAGE_SIZE,
  type ParentAttendanceRow,
  type ParentStudent,
} from '../services/parent';
import { useSelectionStore } from '../store/selectionStore';
import { useChildHubRestore, useHubAwareBack } from '../navigation/ChildHubNavContext';
import { ScreenDecor } from '../components/ScreenDecor';
import { EmptyState } from '../components/EmptyState';
import { kindFromStatus, sessionTimeRange } from '../utils/dashboardHome';
import {
  filterRowsByKind,
  groupRowsByDay,
  rowsInCalendarMonth,
  type AttendanceFilter,
  type DaySection,
} from '../utils/attendanceHistory';

type AttendanceTab = 'overview' | 'calendar';
import { AttendanceCalendarView } from '../components/AttendanceCalendarView';
import { AttendanceDashboard } from '../components/AttendanceDashboard';
import { AttendanceHeroHeader } from '../components/layout/AttendanceHeroHeader';
import {
  clampMonthToSession,
  resolveSessionRange,
  sessionMonthAnchors,
} from '../utils/academicSession';
import type { AppTheme } from '../theme';
import { shadows, useAppColors } from '../theme/appTheme';
import { useAppLanguage, type TranslationKey } from '../common';
import { formatAppDate } from '../utils/appDateLocale';

function statusLabel(
  kind: ReturnType<typeof kindFromStatus>,
  raw: string,
  t: (
    key: TranslationKey,
    params?: Record<string, string | number | undefined>
  ) => string
): string {
  if (kind === 'present') return t('attendance.status.present');
  if (kind === 'absent') return t('attendance.status.absent');
  if (kind === 'late') return t('attendance.status.late');
  if (kind === 'leave') return t('attendance.status.leave');
  return raw.toUpperCase();
}

function SessionCard({
  row,
  theme,
  highlighted,
}: {
  row: ParentAttendanceRow;
  theme: AppTheme;
  highlighted?: boolean;
}) {
  const { t } = useAppLanguage();
  const kind = kindFromStatus(row.status);
  const label = statusLabel(kind, row.status, t);
  const timeRange =
    sessionTimeRange(row) ||
    `${t('common.dash')} – ${t('common.dash')}`;
  const headerBg =
    kind === 'present'
      ? theme.palette.successSoft
      : kind === 'absent'
        ? theme.palette.dangerSoft
        : kind === 'late'
          ? theme.palette.warningSoft
          : kind === 'leave'
            ? theme.palette.card4_alpha
            : theme.colors.surfaceVariant;
  const headerFg =
    kind === 'present'
      ? theme.colors.success
      : kind === 'absent'
        ? theme.colors.error
        : kind === 'late'
          ? theme.colors.warning
          : kind === 'leave'
            ? theme.palette.card4_base
            : theme.colors.onSurfaceVariant;

  return (
    <View
      style={[
        styles.sessionOuter,
        shadows.card,
        {
          borderColor: highlighted ? theme.colors.success : 'transparent',
          borderWidth: highlighted ? 1.5 : 0,
          backgroundColor: theme.colors.surface,
        },
      ]}
    >
      <View style={[styles.sessionHeader, { backgroundColor: headerBg }]}>
        <Text
          variant="titleSmall"
          style={{ color: headerFg, fontWeight: '800' }}
        >
          {label}
        </Text>
      </View>
      <View style={styles.sessionBody}>
        <View style={styles.sessionRow}>
          <MaterialCommunityIcons
            name="clock-outline"
            size={16}
            color={theme.colors.onSurfaceVariant}
          />
          <Text
            variant="bodySmall"
            style={{
              color: theme.colors.onSurfaceVariant,
              marginLeft: 6,
              flex: 1,
            }}
          >
            {timeRange}
            <Text style={{ color: theme.colors.outline }}> · </Text>
            <Text style={{ color: theme.colors.onSurfaceVariant }}>
              {t('attendance.session')}
            </Text>
          </Text>
        </View>
        {kind === 'absent' ? (
          <View style={styles.infoRow}>
            <MaterialCommunityIcons
              name="information-outline"
              size={16}
              color={theme.colors.onSurfaceVariant}
            />
            <Text
              variant="bodySmall"
              style={{
                color: theme.colors.onSurfaceVariant,
                marginLeft: 6,
                flex: 1,
              }}
            >
              {t('attendance.noCheckIn')}
            </Text>
          </View>
        ) : null}
        {kind === 'late' ? (
          <View style={styles.warnRow}>
            <MaterialCommunityIcons
              name="alert-outline"
              size={16}
              color={theme.colors.warning}
            />
            <Text
              variant="bodySmall"
              style={{
                color: theme.colors.onSurfaceVariant,
                marginLeft: 6,
                flex: 1,
              }}
            >
              {t('attendance.markedLate')}
            </Text>
          </View>
        ) : null}
        {kind === 'present' ? (
          <View style={styles.infoRow}>
            <MaterialCommunityIcons
              name="check-circle-outline"
              size={16}
              color={theme.colors.success}
            />
            <Text
              variant="bodySmall"
              style={{
                color: theme.colors.onSurfaceVariant,
                marginLeft: 6,
                flex: 1,
              }}
            >
              {t('attendance.recordedPresent')}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

function findAttendanceIdBySessionDate(
  rows: ParentAttendanceRow[],
  sessionDate: string
): number | null {
  const target = sessionDate.trim().slice(0, 10);
  if (!target) return null;
  for (const row of rows) {
    if (row.sessionDate.slice(0, 10) === target) return row.attendanceId;
  }
  return null;
}

export function AttendanceScreen({
  embedded,
  highlightAttendanceId,
  highlightSessionDate,
}: {
  embedded?: boolean;
  highlightAttendanceId?: number;
  highlightSessionDate?: string;
} = {}) {
  const theme = useTheme() as AppTheme;
  const colors = useAppColors();
  const { t, language } = useAppLanguage();
  const restore = useChildHubRestore();
  const goBack = useHubAwareBack();
  const STATUS_CHIPS = useMemo(
    () =>
      [
        { key: 'all' as const, label: t('attendance.chipAll') },
        { key: 'present' as const, label: t('attendance.statPresent') },
        { key: 'absent' as const, label: t('attendance.statAbsent') },
        { key: 'late' as const, label: t('attendance.statLate') },
        { key: 'leave' as const, label: t('attendance.statLeave') },
      ] satisfies { key: AttendanceFilter; label: string }[],
    [t]
  );
  const studentId = useSelectionStore((s) => s.selectedStudentId);

  const [student, setStudent] = useState<ParentStudent | null>(null);
  const [allRows, setAllRows] = useState<ParentAttendanceRow[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedCalendarDay, setSelectedCalendarDay] = useState<Date | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focusMonth, setFocusMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [filter, setFilter] = useState<AttendanceFilter>('all');
  const [tab, setTab] = useState<AttendanceTab>('overview');
  const [monthModal, setMonthModal] = useState(false);
  const [contactModal, setContactModal] = useState(false);
  const [sessionRange, setSessionRange] = useState<{ start: Date; end: Date } | null>(
    null
  );
  const highlightDoneRef = useRef(false);
  const userPickedDayRef = useRef(false);

  const PAGE_SIZE = PARENT_ATTENDANCE_PAGE_SIZE;

  useEffect(() => {
    if (!highlightSessionDate) return;
    try {
      const iso =
        highlightSessionDate.length === 10
          ? `${highlightSessionDate}T12:00:00`
          : highlightSessionDate;
      const d = parseISO(iso);
      setFocusMonth(new Date(d.getFullYear(), d.getMonth(), 1));
      setSelectedCalendarDay(d);
      setFilter('all');
      setTab('calendar');
    } catch {
      /* ignore invalid date */
    }
  }, [highlightSessionDate]);

  useEffect(() => {
    highlightDoneRef.current = false;
  }, [highlightAttendanceId, highlightSessionDate, studentId]);

  const load = useCallback(async () => {
    if (!studentId) {
      setStudent(null);
      setAllRows([]);
      setSessionRange(null);
      return;
    }
    setError(null);
    setLoading(true);
    setPage(0);
    try {
      const [stRes, attRes, calRes] = await Promise.all([
        getMyStudents(),
        getStudentAttendance(studentId, 0, PAGE_SIZE),
        getStudentSchoolCalendar(studentId).catch(() => null),
      ]);
      const nextStudent =
        stRes.status && Array.isArray(stRes.data)
          ? stRes.data.find((s) => s.id === studentId) ?? null
          : null;
      setStudent(nextStudent);
      setSessionRange(
        resolveSessionRange({
          startDate: calRes?.status ? calRes.data?.startDate : null,
          endDate: calRes?.status ? calRes.data?.endDate : null,
          academicYear:
            calRes?.status && calRes.data?.sessionName
              ? calRes.data.sessionName
              : nextStudent?.academicYear,
        })
      );
      if (attRes.status && attRes.data?.content) {
        setAllRows(attRes.data.content);
        setHasMore(
          (attRes.data.number ?? 0) + 1 < (attRes.data.totalPages ?? 1)
        );
      } else {
        setAllRows([]);
        setHasMore(false);
        setError(attRes.message || t('attendance.couldNotLoad'));
      }
    } catch {
      setAllRows([]);
      setHasMore(false);
      setError(t('attendance.networkError'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [studentId, t]);

  const loadMore = useCallback(async () => {
    if (!studentId || !hasMore || loadingMore) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    try {
      const attRes = await getStudentAttendance(studentId, nextPage, PAGE_SIZE);
      if (attRes.status && attRes.data?.content) {
        setAllRows((prev) => [...prev, ...attRes.data!.content!]);
        setPage(nextPage);
        setHasMore(nextPage + 1 < (attRes.data.totalPages ?? 1));
      } else {
        setHasMore(false);
      }
    } finally {
      setLoadingMore(false);
    }
  }, [studentId, hasMore, loadingMore, page]);

  useEffect(() => {
    load();
  }, [load]);

  const monthRows = useMemo(
    () => rowsInCalendarMonth(allRows, focusMonth),
    [allRows, focusMonth]
  );
  const filteredMonthRows = useMemo(
    () => filterRowsByKind(monthRows, filter),
    [monthRows, filter]
  );
  const sections: DaySection[] = useMemo(
    () => groupRowsByDay(filteredMonthRows, language),
    [filteredMonthRows, language]
  );

  const calendarDaySections: DaySection[] = useMemo(() => {
    if (!selectedCalendarDay) return [];
    const key = format(selectedCalendarDay, 'yyyy-MM-dd');
    return sections.filter((s) =>
      s.data.some((row) => row.sessionDate?.slice(0, 10) === key)
    );
  }, [sections, selectedCalendarDay]);

  const resolvedHighlightId = useMemo(() => {
    if (highlightAttendanceId) return highlightAttendanceId;
    if (highlightSessionDate) {
      return findAttendanceIdBySessionDate(allRows, highlightSessionDate);
    }
    return null;
  }, [highlightAttendanceId, highlightSessionDate, allRows]);

  useEffect(() => {
    if (!resolvedHighlightId || highlightDoneRef.current || loading) return;
    const row = allRows.find((r) => r.attendanceId === resolvedHighlightId);
    if (!row) {
      if (hasMore && !loadingMore) void loadMore();
      return;
    }
    highlightDoneRef.current = true;
    userPickedDayRef.current = true;
    setTab('calendar');
    const dt = row.sessionDate?.slice(0, 10);
    if (dt) {
      try {
        const d = parseISO(`${dt}T12:00:00`);
        setFocusMonth(new Date(d.getFullYear(), d.getMonth(), 1));
        setSelectedCalendarDay(d);
      } catch {
        /* ignore */
      }
    }
    useSelectionStore.getState().setAttendanceHighlight(null);
  }, [
    resolvedHighlightId,
    allRows,
    loading,
    hasMore,
    loadingMore,
    loadMore,
  ]);

  useEffect(() => {
    userPickedDayRef.current = false;
  }, [studentId, filter]);

  useEffect(() => {
    if (loading) return;
    if (userPickedDayRef.current) return;
    if (resolvedHighlightId && !highlightDoneRef.current) return;
    const latest = sections[0];
    if (!latest) {
      setSelectedCalendarDay(null);
      return;
    }
    try {
      setSelectedCalendarDay(parseISO(`${latest.dayKey}T12:00:00`));
    } catch {
      setSelectedCalendarDay(null);
    }
  }, [sections, loading, resolvedHighlightId]);

  const batchSubtitle = useMemo(() => {
    if (!student) return '';
    const b = student.batchNames?.length
      ? student.batchNames.join(' · ')
      : t('common.dash');
    return `${student.instituteName}  |  ${b}`;
  }, [student, t]);

  const monthChoices = useMemo(
    () => sessionMonthAnchors(sessionRange),
    [sessionRange]
  );

  useEffect(() => {
    if (!monthChoices.length) return;
    setFocusMonth((current) => clampMonthToSession(current, monthChoices));
  }, [monthChoices]);

  if (!studentId) {
    if (embedded) return null;
    return (
      <ScreenDecor>
        <SafeAreaView style={styles.safe} edges={['top']}>
          <View style={styles.center}>
            <EmptyState
              icon="gesture-tap"
              title={t('attendance.pickStudentTitle')}
              message={t('attendance.pickStudentMessage')}
            />
          </View>
        </SafeAreaView>
      </ScreenDecor>
    );
  }

  const body = (
    <>
      {embedded ? (
        <>
          <View style={styles.topBar}>
            <View style={styles.topActions}>
              <Pressable
                hitSlop={10}
                style={styles.iconBtn}
                onPress={() => setMonthModal(true)}
              >
                <MaterialCommunityIcons
                  name="calendar-month-outline"
                  size={24}
                  color={theme.colors.onBackground}
                />
              </Pressable>
            </View>
          </View>

          <View style={styles.titleBlock}>
            <Text
              variant="titleLarge"
              style={[styles.title, { color: theme.colors.onBackground }]}
              numberOfLines={2}
            >
              {t('attendance.historyTitle', {
                name: student?.name ?? t('common.student'),
              })}
            </Text>
            <Text
              variant="bodyMedium"
              style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}
              numberOfLines={4}
            >
              {batchSubtitle || t('common.loading')}
            </Text>
          </View>
        </>
      ) : null}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
            tintColor={theme.colors.primary}
          />
        }
      >
        {loading && allRows.length === 0 ? (
          <View style={styles.loader}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        ) : (
          <View>
            <View style={[styles.tabs, { borderBottomColor: colors.border }]}>
              {(
                [
                  { id: 'overview' as const, label: t('attendance.tabOverview') },
                  { id: 'calendar' as const, label: t('attendance.calendarView') },
                ]
              ).map((item) => {
                const active = tab === item.id;
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => setTab(item.id)}
                    style={styles.tabBtn}
                  >
                    <Text style={[styles.tabLabel, active && { color: colors.primary, fontWeight: '800' }]}>
                      {item.label}
                    </Text>
                    <View
                      style={[
                        styles.tabUnderline,
                        active && { backgroundColor: colors.primary },
                      ]}
                    />
                  </Pressable>
                );
              })}
            </View>

            {tab === 'overview' ? (
              <>
            <AttendanceDashboard
              rows={allRows}
              focusMonth={focusMonth}
              sessionMonths={monthChoices}
              onPressMonth={() => setMonthModal(true)}
                  onSelectMonth={(month) => {
                    userPickedDayRef.current = false;
                    setFocusMonth(new Date(month.getFullYear(), month.getMonth(), 1));
                  }}
                />
                {hasMore ? (
                  <Button
                    mode="outlined"
                    loading={loadingMore}
                    onPress={() => void loadMore()}
                    style={{ marginTop: 4, marginBottom: 16 }}
                  >
                    {t('attendance.loadMore')}
                  </Button>
                ) : null}
              </>
            ) : (
              <>
                <ScrollView
                  horizontal
                  nestedScrollEnabled
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.chipRow}
                >
                  {STATUS_CHIPS.map((chip) => {
                    const on = filter === chip.key;
                    return (
                      <Pressable
                        key={chip.key}
                        onPress={() => setFilter(chip.key)}
                        style={[
                          styles.chip,
                          {
                            backgroundColor: on
                              ? theme.colors.primary
                              : theme.colors.surface,
                            borderColor: on
                              ? theme.colors.primary
                              : theme.colors.outlineVariant,
                          },
                        ]}
                      >
                        <Text
                          variant="labelMedium"
                          style={{
                            color: on ? '#FFFFFF' : theme.colors.onSurface,
                            fontWeight: '700',
                          }}
                        >
                          {chip.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
                <AttendanceCalendarView
                  monthAnchor={focusMonth}
                  rows={filteredMonthRows}
                  selectedDay={selectedCalendarDay}
                  sessionRange={sessionRange}
                  onSelectDay={(d) => {
                    userPickedDayRef.current = true;
                    setSelectedCalendarDay(d);
                  }}
                  onPressMonth={() => setMonthModal(true)}
                />
                {calendarDaySections.map((section) => (
                  <View key={section.title}>
                    <View
                      style={[
                        styles.dayHeader,
                        { backgroundColor: theme.colors.background },
                      ]}
                    >
                      <MaterialCommunityIcons
                        name="calendar"
                        size={18}
                        color={theme.colors.primary}
                      />
                      <Text
                        variant="titleSmall"
                        style={{
                          color: theme.colors.onBackground,
                          fontWeight: '700',
                          marginLeft: 8,
                        }}
                      >
                        {section.title}
                      </Text>
                    </View>
                    {section.data.map((item) => (
                      <SessionCard
                        key={item.attendanceId}
                        row={item}
                        theme={theme}
                        highlighted={resolvedHighlightId === item.attendanceId}
                      />
                    ))}
                  </View>
                ))}
                {selectedCalendarDay && calendarDaySections.length === 0 ? (
                  <EmptyState
                    icon="calendar-blank-outline"
                    title={
                      filter !== 'all'
                        ? t('attendance.emptyNoMatch')
                        : t('attendance.noSessionsOnDay', {
                            date: formatAppDate(selectedCalendarDay, 'd MMM', language),
                          })
                    }
                    message={
                      filter !== 'all'
                        ? t('attendance.tryFilterOrMonth')
                        : t('attendance.noRowsThisDay')
                    }
                  />
                ) : null}
                {!selectedCalendarDay && !loading && sections.length === 0 ? (
                  <EmptyState
                    icon={error ? 'alert-circle-outline' : 'calendar-blank-outline'}
                    title={
                      error
                        ? t('attendance.emptyCouldNotLoad')
                        : filter !== 'all'
                          ? t('attendance.emptyNoMatch')
                          : t('attendance.emptyNoSessions')
                    }
                    message={
                      error ??
                      (filter !== 'all'
                        ? t('attendance.tryFilterOrMonth')
                        : t('attendance.noRowsThisMonth'))
                    }
                  />
                ) : null}
                <View style={styles.footer}>
                  {hasMore ? (
                    <Button
                      mode="outlined"
                      loading={loadingMore}
                      onPress={() => void loadMore()}
                      style={{ marginBottom: 16 }}
                    >
                      {t('attendance.loadMore')}
                    </Button>
                  ) : null}
                  <Text
                    variant="bodySmall"
                    style={{
                      color: theme.colors.onSurfaceVariant,
                      marginBottom: 10,
                    }}
                  >
                    {t('attendance.reportAbsence')}
                  </Text>
                  <Button
                    mode="contained-tonal"
                    onPress={() => setContactModal(true)}
                    icon="phone-outline"
                  >
                    {t('attendance.contactButton')}
                  </Button>
                </View>
              </>
            )}
          </View>
        )}
      </ScrollView>

      <Modal
        visible={contactModal}
        transparent
        animationType="fade"
        onRequestClose={() => setContactModal(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setContactModal(false)}
        >
          <Pressable
            style={[
              styles.modalCard,
              { backgroundColor: theme.colors.surface },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <View
              style={[
                styles.contactIconWrap,
                { backgroundColor: theme.colors.primaryContainer },
              ]}
            >
              <MaterialCommunityIcons
                name="phone-outline"
                size={28}
                color={theme.colors.primary}
              />
            </View>
            <Text
              variant="titleMedium"
              style={{ fontWeight: '700', marginBottom: 8, textAlign: 'center' }}
            >
              {t('attendance.contactInstituteTitle')}
            </Text>
            <Text
              variant="bodyMedium"
              style={{
                color: theme.colors.onSurfaceVariant,
                lineHeight: 22,
                marginBottom: 20,
                textAlign: 'center',
              }}
            >
              {t('attendance.contactInstituteMessage')}
            </Text>
            <Button mode="contained" onPress={() => setContactModal(false)}>
              {t('common.ok')}
            </Button>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={monthModal}
        transparent
        animationType="fade"
        onRequestClose={() => setMonthModal(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setMonthModal(false)}
        >
          <Pressable
            style={[
              styles.modalCard,
              { backgroundColor: theme.colors.surface },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text
              variant="titleMedium"
              style={{ fontWeight: '700', marginBottom: 12 }}
            >
              {t('attendance.jumpToMonth')}
            </Text>
            <ScrollView style={{ maxHeight: 360 }}>
              {monthChoices.map((d) => {
                const active =
                  d.getFullYear() === focusMonth.getFullYear() &&
                  d.getMonth() === focusMonth.getMonth();
                return (
                  <Pressable
                    key={`${d.getFullYear()}-${d.getMonth()}`}
                    style={[
                      styles.modalRow,
                      active && {
                        backgroundColor: theme.colors.primaryContainer,
                      },
                    ]}
                    onPress={() => {
                      userPickedDayRef.current = false;
                      setFocusMonth(new Date(d.getFullYear(), d.getMonth(), 1));
                      setMonthModal(false);
                    }}
                  >
                    <Text
                      style={{
                        color: theme.colors.onSurface,
                        fontWeight: active ? '700' : '400',
                      }}
                    >
                      {formatAppDate(d, 'MMMM yyyy', language)}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );

  if (embedded) {
    return <View style={styles.embedded}>{body}</View>;
  }

  return (
    <View style={[styles.standalone, { backgroundColor: colors.background }]}>
      <AttendanceHeroHeader student={student} onBack={restore ? goBack : undefined} />
      {body}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  standalone: { flex: 1 },
  embedded: { flex: 1 },
  center: { flex: 1, padding: 20, justifyContent: 'center' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    marginTop: 4,
  },
  topActions: { flexDirection: 'row', alignItems: 'center' },
  iconBtn: { padding: 8, marginLeft: 4 },
  titleBlock: {
    alignSelf: 'stretch',
    alignItems: 'center',
    paddingHorizontal: 12,
    marginTop: 12,
    marginBottom: 4,
  },
  title: { fontWeight: '800', textAlign: 'center', width: '100%' },
  subtitle: { marginTop: 6, textAlign: 'center', width: '100%' },
  listContent: { paddingHorizontal: 16, paddingBottom: 40 },
  tabs: {
    flexDirection: 'row',
    marginBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tabBtn: { flex: 1, alignItems: 'center', paddingTop: 4 },
  tabLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#9CA3AF',
    paddingBottom: 10,
  },
  tabUnderline: {
    alignSelf: 'stretch',
    height: 3,
    borderRadius: 2,
    backgroundColor: 'transparent',
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
    marginBottom: 12,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingTop: 14,
  },
  sessionOuter: {
    borderRadius: 20,
    marginBottom: 10,
    overflow: 'hidden',
  },
  sessionHeader: { paddingHorizontal: 12, paddingVertical: 10 },
  sessionBody: { paddingHorizontal: 12, paddingVertical: 10 },
  sessionRow: { flexDirection: 'row', alignItems: 'center' },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 8 },
  warnRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 8 },
  loader: { paddingVertical: 40, alignItems: 'center' },
  footer: { marginTop: 24, paddingBottom: 16 },
  legend: { marginTop: 16, alignItems: 'center' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: { borderRadius: 16, padding: 16, maxHeight: '80%' },
  modalRow: { paddingVertical: 14, paddingHorizontal: 12, borderRadius: 10 },
  contactIconWrap: {
    alignSelf: 'center',
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
});
