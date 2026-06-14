import { format } from 'date-fns';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  SectionList,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Text, useTheme } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import {
  getMyStudents,
  getStudentAttendance,
  type ParentAttendanceRow,
  type ParentStudent,
} from '../services/parent';
import { useSelectionStore } from '../store/selectionStore';
import { ScreenDecor } from '../components/ScreenDecor';
import { EmptyState } from '../components/EmptyState';
import { kindFromStatus, sessionTimeRange } from '../utils/dashboardHome';
import {
  filterRowsByKind,
  groupRowsByDay,
  lastNMonthAnchors,
  monthSessionStats,
  rowsInCalendarMonth,
  type AttendanceFilter,
  type DaySection,
} from '../utils/attendanceHistory';
import { AttendanceCalendarView } from '../components/AttendanceCalendarView';
import type { AppTheme } from '../theme';
import { useAppLanguage, type TranslationKey } from '../common';

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
  return raw.toUpperCase();
}

function SessionCard({
  row,
  theme,
}: {
  row: ParentAttendanceRow;
  theme: AppTheme;
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
          : theme.colors.surfaceVariant;
  const headerFg =
    kind === 'present'
      ? theme.colors.success
      : kind === 'absent'
        ? theme.colors.error
        : kind === 'late'
          ? theme.colors.warning
          : theme.colors.onSurfaceVariant;

  return (
    <View
      style={[
        styles.sessionOuter,
        {
          borderColor: theme.colors.outlineVariant,
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
        <Text
          variant="labelMedium"
          style={{ color: headerFg, marginTop: 2, opacity: 0.9 }}
        >
          {row.batchName}
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

function MonthSummaryBanner({
  monthAnchor,
  stats,
  theme,
}: {
  monthAnchor: Date;
  stats: ReturnType<typeof monthSessionStats>;
  theme: AppTheme;
}) {
  const { t } = useAppLanguage();
  const mon = format(monthAnchor, 'MMM').toUpperCase();
  const yr = format(monthAnchor, 'yyyy');
  return (
    <View
      style={[
        styles.summaryBanner,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.outlineVariant,
        },
      ]}
    >
      <View
        style={[
          styles.summaryLeft,
          { backgroundColor: theme.colors.primaryContainer },
        ]}
      >
        <Text
          variant="labelLarge"
          style={{
            color: theme.colors.primary,
            fontWeight: '800',
            textAlign: 'center',
          }}
        >
          {mon}
        </Text>
        <Text
          variant="labelMedium"
          style={{
            color: theme.colors.primary,
            textAlign: 'center',
            marginTop: 2,
          }}
        >
          {yr}
        </Text>
      </View>
      <View style={styles.summaryRight}>
        <Text
          variant="titleSmall"
          style={{ color: theme.colors.onSurface, fontWeight: '700' }}
        >
          {t('attendance.summaryPresentMonth', { pct: stats.pctPresent })}
        </Text>
        <View style={styles.summaryChips}>
          <View
            style={[
              styles.miniChip,
              { backgroundColor: theme.palette.successSoft },
            ]}
          >
            <Text
              variant="labelSmall"
              style={{ color: theme.colors.success, fontWeight: '700' }}
            >
              {t('attendance.countPresent', { n: stats.present })}
            </Text>
          </View>
          <View
            style={[
              styles.miniChip,
              { backgroundColor: theme.palette.dangerSoft },
            ]}
          >
            <Text
              variant="labelSmall"
              style={{ color: theme.colors.error, fontWeight: '700' }}
            >
              {t('attendance.countAbsent', { n: stats.absent })}
            </Text>
          </View>
          <View
            style={[
              styles.miniChip,
              { backgroundColor: theme.palette.warningSoft },
            ]}
          >
            <Text
              variant="labelSmall"
              style={{ color: theme.colors.warning, fontWeight: '700' }}
            >
              {t('attendance.countLate', { n: stats.late })}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

export function AttendanceScreen({ embedded }: { embedded?: boolean } = {}) {
  const theme = useTheme() as AppTheme;
  const { t } = useAppLanguage();
  const FILTER_OPTIONS = useMemo(
    () =>
      [
        { key: 'all' as const, label: t('attendance.filterAll') },
        { key: 'present' as const, label: t('attendance.filterPresentOnly') },
        { key: 'absent' as const, label: t('attendance.filterAbsentOnly') },
        { key: 'late' as const, label: t('attendance.filterLateOnly') },
      ] satisfies { key: AttendanceFilter; label: string }[],
    [t]
  );
  const studentId = useSelectionStore((s) => s.selectedStudentId);

  const [student, setStudent] = useState<ParentStudent | null>(null);
  const [allRows, setAllRows] = useState<ParentAttendanceRow[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focusMonth, setFocusMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [filter, setFilter] = useState<AttendanceFilter>('all');
  const [filterModal, setFilterModal] = useState(false);
  const [monthModal, setMonthModal] = useState(false);

  const PAGE_SIZE = 25;

  const load = useCallback(async () => {
    if (!studentId) {
      setStudent(null);
      setAllRows([]);
      return;
    }
    setError(null);
    setLoading(true);
    setPage(0);
    try {
      const [stRes, attRes] = await Promise.all([
        getMyStudents(),
        getStudentAttendance(studentId, 0, PAGE_SIZE),
      ]);
      if (stRes.status && Array.isArray(stRes.data)) {
        setStudent(stRes.data.find((s) => s.id === studentId) ?? null);
      } else {
        setStudent(null);
      }
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
  const stats = useMemo(() => monthSessionStats(monthRows), [monthRows]);
  const sections: DaySection[] = useMemo(
    () => groupRowsByDay(filteredMonthRows),
    [filteredMonthRows]
  );

  const batchSubtitle = useMemo(() => {
    if (!student) return '';
    const b = student.batchNames?.length
      ? student.batchNames.join(' · ')
      : t('common.dash');
    return `${student.instituteName}  |  ${b}`;
  }, [student, t]);

  const monthChoices = useMemo(() => lastNMonthAnchors(12), []);

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
      <View style={styles.topBar}>
        <View style={styles.topActions}>
          <Pressable
            hitSlop={10}
            style={styles.iconBtn}
            onPress={() => setFilterModal(true)}
          >
            <MaterialCommunityIcons
              name="filter-variant"
              size={24}
              color={theme.colors.onBackground}
            />
          </Pressable>
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

      <View style={styles.viewToggleRow}>
        <Pressable
          onPress={() => setViewMode('list')}
          style={[
            styles.viewToggleBtn,
            viewMode === 'list' && {
              backgroundColor: theme.colors.primaryContainer,
            },
          ]}
        >
          <Text style={{ color: theme.colors.primary, fontWeight: '700' }}>
            {t('attendance.listView')}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setViewMode('calendar')}
          style={[
            styles.viewToggleBtn,
            viewMode === 'calendar' && {
              backgroundColor: theme.colors.primaryContainer,
            },
          ]}
        >
          <Text style={{ color: theme.colors.primary, fontWeight: '700' }}>
            {t('attendance.calendarView')}
          </Text>
        </Pressable>
      </View>

      {viewMode === 'calendar' ? (
        <View style={{ paddingHorizontal: 16 }}>
          <MonthSummaryBanner
            monthAnchor={focusMonth}
            stats={stats}
            theme={theme}
          />
          <AttendanceCalendarView monthAnchor={focusMonth} rows={monthRows} />
          {sections.map((section) => (
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
                <SessionCard key={item.attendanceId} row={item} theme={theme} />
              ))}
            </View>
          ))}
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => String(item.attendanceId)}
          stickySectionHeadersEnabled
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
          ListHeaderComponent={
            <View style={{ marginBottom: 12 }}>
              <MonthSummaryBanner
                monthAnchor={focusMonth}
                stats={stats}
                theme={theme}
              />
              {filter !== 'all' ? (
                <Text
                  variant="labelMedium"
                  style={{ color: theme.colors.primary, marginTop: 8 }}
                >
                  {t('attendance.filterActive', {
                    label:
                      FILTER_OPTIONS.find((f) => f.key === filter)?.label ?? '',
                  })}
                </Text>
              ) : null}
            </View>
          }
          ListEmptyComponent={
            loading ? (
              <View style={styles.loader}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
              </View>
            ) : (
              <EmptyState
                icon={error ? 'alert-circle-outline' : 'calendar-blank-outline'}
                title={
                  error
                    ? t('attendance.emptyCouldNotLoad')
                    : t('attendance.emptyNoSessions')
                }
                message={
                  error ??
                  (filter !== 'all'
                    ? t('attendance.tryFilterOrMonth')
                    : t('attendance.noRowsThisMonth'))
                }
              />
            )
          }
          renderSectionHeader={({ section: { title } }) => (
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
                {title}
              </Text>
            </View>
          )}
          renderItem={({ item }) => <SessionCard row={item} theme={theme} />}
          ListFooterComponent={
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
                onPress={() =>
                  Alert.alert(
                    t('attendance.contactInstituteTitle'),
                    t('attendance.contactInstituteMessage')
                  )
                }
                icon="phone-outline"
              >
                {t('attendance.contactButton')}
              </Button>
              <View style={styles.legend}>
                <Text
                  variant="labelSmall"
                  style={{ color: theme.colors.onSurfaceVariant }}
                >
                  {t('attendance.legend')}
                </Text>
              </View>
            </View>
          }
        />
      )}

      <Modal
        visible={filterModal}
        transparent
        animationType="fade"
        onRequestClose={() => setFilterModal(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setFilterModal(false)}
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
              {t('attendance.filterByStatus')}
            </Text>
            {FILTER_OPTIONS.map((opt) => (
              <Pressable
                key={opt.key}
                style={[
                  styles.modalRow,
                  filter === opt.key && {
                    backgroundColor: theme.colors.primaryContainer,
                  },
                ]}
                onPress={() => {
                  setFilter(opt.key);
                  setFilterModal(false);
                }}
              >
                <Text
                  style={{
                    color: theme.colors.onSurface,
                    fontWeight: filter === opt.key ? '700' : '400',
                  }}
                >
                  {opt.label}
                </Text>
              </Pressable>
            ))}
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
                      {format(d, 'MMMM yyyy')}
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
    <ScreenDecor>
      <SafeAreaView style={styles.safe} edges={['top']}>
        {body}
      </SafeAreaView>
    </ScreenDecor>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
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
  summaryBanner: {
    flexDirection: 'row',
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    marginTop: 16,
    elevation: 2,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
  },
  summaryLeft: {
    width: 76,
    paddingVertical: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryRight: { flex: 1, padding: 14, justifyContent: 'center' },
  summaryChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  miniChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingTop: 14,
  },
  sessionOuter: {
    borderRadius: 14,
    borderWidth: 1,
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
  viewToggleRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  viewToggleBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
});
