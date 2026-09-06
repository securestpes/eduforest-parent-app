import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  DeviceEventEmitter,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Button, Text, useTheme } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import { formatLocalDateTime } from '../utils/localDateTime';
import {
  getFeeNotifications,
  getMyStudents,
  getStudentAttendance,
  PARENT_ATTENDANCE_PAGE_SIZE,
  type ParentAttendanceRow,
  type ParentFeeNotification,
  ParentStudent,
} from '../services/parent';
import { useSelectionStore } from '../store/selectionStore';
import { EmptyState } from '../components/EmptyState';
import {
  applyUnreadFlags,
  buildWeeklySummary,
  collectCenterNotifications,
  NOTIFICATION_RECENT_DAYS,
  partitionRecentAndOlder,
  sortNotificationsUnreadFirst,
  splitNotificationsByRecency,
  type CenterNotification,
  type WeeklySummaryBlock,
} from '../utils/notificationCenter';
import type { AppTheme } from '../theme';
import { shadows, useAppColors } from '../theme/appTheme';
import { StudentModuleHero } from '../components/layout/StudentModuleHero';
import { navigateToChildScreen, navigateToTab } from '../navigation/navigationRef';
import type { RootStackParamList } from '../navigation/Navigation';
import { APP_NOTIFICATION_RECEIVED_EVENT } from '../constants/notifications';
import { useAppLanguage } from '../common';
import {
  getNotificationsLastOpenedAt,
  markNotificationsOpenedNow,
} from '../services/notificationReadState';

function accentColor(
  accent: CenterNotification['accent'],
  theme: AppTheme
): string {
  if (accent === 'danger') return theme.colors.error;
  if (accent === 'warning') return theme.colors.warning;
  if (accent === 'success') return theme.colors.success;
  return theme.colors.primary;
}

function NotifCard({
  item,
  theme,
  onViewDetails,
}: {
  item: CenterNotification;
  theme: AppTheme;
  onViewDetails: () => void;
}) {
  const { t } = useAppLanguage();
  const dot = accentColor(item.accent, theme);
  const isFee =
    item.kind === 'fee_payment' || item.kind === 'fee_reminder';
  const isExam = item.kind === 'exam_results';
  const isLeave = item.kind === 'leave_status';
  const isHomework = item.kind === 'homework';
  const pillBg =
    item.accent === 'danger'
      ? theme.colors.errorContainer
      : item.accent === 'warning'
        ? theme.colors.secondaryContainer
        : item.accent === 'success'
          ? theme.palette.successSoft
          : theme.colors.primaryContainer;
  return (
    <View
      style={[
        styles.card,
        shadows.card,
        {
          backgroundColor: theme.colors.surface,
          borderLeftWidth: item.unread ? 3 : 0,
          borderLeftColor: item.unread
            ? theme.colors.primary
            : 'transparent',
        },
      ]}
    >
      <View style={styles.cardTop}>
        <View style={styles.cardTopLeft}>
          <View style={[styles.statusPill, { backgroundColor: pillBg }]}>
            <Text
              variant="labelSmall"
              style={{ color: dot, fontWeight: '800' }}
            >
              {item.statusLabel}
            </Text>
          </View>
          {item.unread ? (
            <Text
              variant="labelSmall"
              style={{ color: theme.colors.primary, fontWeight: '700' }}
            >
              {t('notifications.newBadge')}
            </Text>
          ) : null}
        </View>
        <Text
          variant="labelSmall"
          style={{ color: theme.colors.onSurfaceVariant }}
        >
          {item.timeLabel}
        </Text>
      </View>
      <Text
        variant="titleSmall"
        style={{
          color: theme.colors.onSurface,
          fontWeight: item.unread ? '800' : '700',
          marginTop: 8,
        }}
      >
        {item.headline}
      </Text>
      <Text
        variant="bodySmall"
        style={{ color: theme.colors.onSurfaceVariant, marginTop: 6 }}
      >
        {item.detail}
      </Text>
      <View style={styles.cardActions}>
        <Button
          mode="contained-tonal"
          compact
          onPress={onViewDetails}
          style={styles.actionBtn}
          icon={
            isExam
              ? 'clipboard-text-outline'
              : isLeave
                ? 'calendar-account-outline'
                : isHomework
                  ? 'book-open-page-variant-outline'
                  : isFee
                    ? 'currency-inr'
                    : 'calendar-check'
          }
        >
          {isExam
            ? t('notifications.viewExams')
            : isLeave
              ? t('notifications.viewLeaves')
              : isHomework
                ? t('notifications.viewHomework')
                : isFee
                  ? t('notifications.viewFees')
                  : t('notifications.viewDetails')}
        </Button>
      </View>
    </View>
  );
}

function WeeklyCard({
  block,
  theme,
  onOpenAttendance,
}: {
  block: WeeklySummaryBlock;
  theme: AppTheme;
  onOpenAttendance: () => void;
}) {
  const { t } = useAppLanguage();
  return (
    <Pressable
      onPress={onOpenAttendance}
      style={[
        styles.weeklyCard,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.outlineVariant,
        },
      ]}
    >
      <View style={styles.weeklyTop}>
        <MaterialCommunityIcons
          name="chart-box-outline"
          size={22}
          color={theme.colors.primary}
        />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text
            variant="titleSmall"
            style={{ color: theme.colors.onSurface, fontWeight: '700' }}
          >
            {block.title}
          </Text>
          <Text
            variant="labelSmall"
            style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}
          >
            {block.dateStr}
          </Text>
        </View>
        <MaterialCommunityIcons
          name="chevron-right"
          size={22}
          color={theme.colors.outline}
        />
      </View>
      {block.lines.map((line, idx) => (
        <Text
          key={`${idx}-${line}`}
          variant="bodySmall"
          style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}
        >
          {line}
        </Text>
      ))}
      <Text
        variant="labelMedium"
        style={{
          color: theme.colors.primary,
          marginTop: 10,
          fontWeight: '700',
        }}
      >
        {t('notifications.viewFullReport')}
      </Text>
    </Pressable>
  );
}

function SectionTitle({
  emoji,
  text,
  theme,
}: {
  emoji: string;
  text: string;
  theme: AppTheme;
}) {
  return (
    <Text
      variant="labelLarge"
      style={[styles.sectionTitle, { color: theme.colors.onSurfaceVariant }]}
    >
      {emoji} {text}
    </Text>
  );
}

type StudentPageState = {
  page: number;
  hasMore: boolean;
};

function hasMoreAttendancePages(
  data: { number?: number; totalPages?: number } | undefined
): boolean {
  if (!data) {
    return false;
  }
  return (data.number ?? 0) + 1 < (data.totalPages ?? 1);
}

export function NotificationsScreen({
  embedded,
}: {
  embedded?: boolean;
} = {}) {
  const theme = useTheme() as AppTheme;
  const colors = useAppColors();
  const { t } = useAppLanguage();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const selectedStudentId = useSelectionStore((s) => s.selectedStudentId);
  const setSelectedStudentId = useSelectionStore((s) => s.setSelectedStudentId);

  const [students, setStudents] = useState<ParentStudent[]>([]);
  const [rowsMap, setRowsMap] = useState<Map<number, ParentAttendanceRow[]>>(
    new Map()
  );
  const [feeAlerts, setFeeAlerts] = useState<ParentFeeNotification[]>([]);
  const [pageStateMap, setPageStateMap] = useState<
    Map<number, StudentPageState>
  >(new Map());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);
  const [showOlder, setShowOlder] = useState(false);
  const [lastOpenedAt, setLastOpenedAt] = useState<number | null>(null);

  const fetchStudentAttendancePage = useCallback(
    async (studentId: number, page: number) => {
      try {
        return await getStudentAttendance(
          studentId,
          page,
          PARENT_ATTENDANCE_PAGE_SIZE
        );
      } catch {
        return null;
      }
    },
    []
  );

  const load = useCallback(async () => {
    try {
      const [stRes, feeRes] = await Promise.all([
        getMyStudents(),
        getFeeNotifications(),
      ]);
      if (!stRes.status || !Array.isArray(stRes.data)) {
        setStudents([]);
        setRowsMap(new Map());
        setPageStateMap(new Map());
        setFeeAlerts([]);
        return;
      }
      const list = stRes.data;
      setStudents(list);
      setFeeAlerts(
        feeRes.status && Array.isArray(feeRes.data) ? feeRes.data : []
      );
      const map = new Map<number, ParentAttendanceRow[]>();
      const pages = new Map<number, StudentPageState>();
      await Promise.all(
        list.map(async (s) => {
          const ar = await fetchStudentAttendancePage(s.id, 0);
          if (ar?.status && ar.data?.content) {
            map.set(s.id, ar.data.content);
            pages.set(s.id, {
              page: 0,
              hasMore: hasMoreAttendancePages(ar.data),
            });
          } else {
            map.set(s.id, []);
            pages.set(s.id, { page: 0, hasMore: false });
          }
        })
      );
      setRowsMap(map);
      setPageStateMap(pages);
      setLastUpdatedAt(Date.now());
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [fetchStudentAttendancePage]);

  const hasMore = useMemo(() => {
    for (const state of pageStateMap.values()) {
      if (state.hasMore) {
        return true;
      }
    }
    return false;
  }, [pageStateMap]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || students.length === 0) {
      return;
    }
    setLoadingMore(true);
    try {
      const targets = students.filter((s) => pageStateMap.get(s.id)?.hasMore);
      if (targets.length === 0) {
        return;
      }

      const nextRowsMap = new Map(rowsMap);
      const nextPageStateMap = new Map(pageStateMap);

      await Promise.all(
        targets.map(async (s) => {
          const current = pageStateMap.get(s.id);
          if (!current?.hasMore) {
            return;
          }
          const nextPage = current.page + 1;
          const ar = await fetchStudentAttendancePage(s.id, nextPage);
          if (ar?.status && ar.data?.content) {
            const existing = nextRowsMap.get(s.id) ?? [];
            nextRowsMap.set(s.id, [...existing, ...ar.data.content]);
            nextPageStateMap.set(s.id, {
              page: nextPage,
              hasMore: hasMoreAttendancePages(ar.data),
            });
          } else {
            nextPageStateMap.set(s.id, { page: current.page, hasMore: false });
          }
        })
      );

      setRowsMap(nextRowsMap);
      setPageStateMap(nextPageStateMap);
    } finally {
      setLoadingMore(false);
    }
  }, [
    fetchStudentAttendancePage,
    hasMore,
    loadingMore,
    pageStateMap,
    rowsMap,
    students,
  ]);

  useEffect(() => {
    load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void (async () => {
        const openedAt = await getNotificationsLastOpenedAt();
        if (active) setLastOpenedAt(openedAt);
        await load();
      })();
      return () => {
        active = false;
        setShowOlder(false);
        void markNotificationsOpenedNow().then(() => {
          setLastOpenedAt(Date.now());
        });
      };
    }, [load])
  );

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(
      APP_NOTIFICATION_RECEIVED_EVENT,
      () => {
        void load();
      }
    );
    return () => sub.remove();
  }, [load]);

  const allItems = useMemo(
    () => collectCenterNotifications(students, rowsMap, feeAlerts, t),
    [students, rowsMap, feeAlerts, t]
  );
  const selectedStudent = useMemo(
    () => students.find((s) => s.id === selectedStudentId) ?? null,
    [students, selectedStudentId]
  );
  const scopedItems = useMemo(() => {
    if (!embedded || !selectedStudent) return allItems;
    return allItems.filter(
      (n) =>
        n.studentId === selectedStudent.id ||
        n.studentName === selectedStudent.name
    );
  }, [allItems, embedded, selectedStudent]);

  const { recent, older } = useMemo(
    () => partitionRecentAndOlder(scopedItems, NOTIFICATION_RECENT_DAYS),
    [scopedItems]
  );

  const feedItems = useMemo(() => {
    const base = showOlder ? [...recent, ...older] : recent;
    return sortNotificationsUnreadFirst(
      applyUnreadFlags(base, lastOpenedAt)
    );
  }, [recent, older, showOlder, lastOpenedAt]);

  const { today, thisWeekNotToday, earlier } = useMemo(
    () => splitNotificationsByRecency(feedItems),
    [feedItems]
  );
  const todaySorted = useMemo(
    () => sortNotificationsUnreadFirst(today),
    [today]
  );
  const thisWeekSorted = useMemo(
    () => sortNotificationsUnreadFirst(thisWeekNotToday),
    [thisWeekNotToday]
  );
  const earlierSorted = useMemo(
    () => sortNotificationsUnreadFirst(earlier),
    [earlier]
  );
  const weekly = useMemo(
    () => buildWeeklySummary(students, rowsMap),
    [students, rowsMap]
  );

  const lastUpdatedLabel = useMemo(() => {
    if (!lastUpdatedAt) return null;
    const secondsAgo = Math.floor((Date.now() - lastUpdatedAt) / 1000);
    if (secondsAgo < 60) return t('common.updatedJustNow');
    return t('common.updatedAt', {
      time: formatLocalDateTime(lastUpdatedAt),
    });
  }, [lastUpdatedAt, t]);

  const goToAttendance = () => {
    navigateToChildScreen({
      section: 'attendance',
      studentId: selectedStudentId ?? undefined,
    });
  };

  const openDetails = (item: CenterNotification) => {
    const student =
      students.find((s) => s.id === item.studentId) ||
      students.find((s) => s.name === item.studentName);
    if (student) setSelectedStudentId(student.id);

    if (item.kind === 'fee_payment' || item.kind === 'fee_reminder') {
      navigateToChildScreen({
        section: 'fees',
        studentId: student?.id,
      });
      return;
    }

    if (item.kind === 'exam_results') {
      navigateToChildScreen({
        section: 'exams',
        studentId: student?.id,
      });
      return;
    }

    if (item.kind === 'leave_status') {
      navigateToChildScreen({
        section: 'leaves',
        studentId: student?.id,
      });
      return;
    }

    if (item.kind === 'homework') {
      navigateToChildScreen({
        section: 'homework',
        studentId: student?.id,
      });
      return;
    }

    if (!item.row) return;
    navigateToChildScreen({
      section: 'attendance',
      studentId: student?.id,
      highlightAttendanceId: item.row.attendanceId,
      highlightSessionDate: item.row.sessionDate.slice(0, 10),
    });
  };

  const goBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigateToTab({ tab: 'Home' });
  };

  const hero = (
    <StudentModuleHero
      title={t('notifications.title')}
      subtitle={t('notifications.subtitle')}
      student={selectedStudent}
      onBack={goBack}
      backAccessibilityLabel={t('attendance.backHome')}
      heroIcon="bell-outline"
      showNotifications={false}
    />
  );

  if (loading) {
    const loader = (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text
          variant="bodyLarge"
          style={{ marginTop: 14, color: theme.colors.onSurfaceVariant }}
        >
          {t('notifications.loading')}
        </Text>
      </View>
    );
    return (
      <View style={[styles.standalone, { backgroundColor: colors.background }]}>
        {hero}
        {loader}
      </View>
    );
  }

  const body = (
    <>
      {lastUpdatedLabel ? (
        <Text
          variant="labelSmall"
          style={{
            color: theme.colors.primary,
            marginVertical: 8,
            marginLeft: 16,
          }}
        >
          {lastUpdatedLabel}
        </Text>
      ) : null}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
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
        {students.length === 0 ? (
          <EmptyState
            icon="bell-off-outline"
            title={t('notifications.emptyNoStudentsTitle')}
            message={t('notifications.emptyNoStudentsMessage')}
          />
        ) : feedItems.length === 0 && older.length === 0 ? (
          <EmptyState
            icon="bell-sleep-outline"
            title={t('notifications.emptyNoActivityTitle')}
            message={t('notifications.emptyNoActivityMessage', {
              days: NOTIFICATION_RECENT_DAYS,
            })}
          />
        ) : feedItems.length === 0 && older.length > 0 ? (
          <EmptyState
            icon="bell-sleep-outline"
            title={t('notifications.emptyRecentTitle', {
              days: NOTIFICATION_RECENT_DAYS,
            })}
            message={t('notifications.emptyRecentMessage')}
          />
        ) : (
          <>
            {todaySorted.length > 0 ? (
              <>
                <SectionTitle
                  emoji="🆕"
                  text={t('notifications.sectionToday')}
                  theme={theme}
                />
                {todaySorted.map((item) => (
                  <NotifCard
                    key={item.id}
                    item={item}
                    theme={theme}
                    onViewDetails={() => openDetails(item)}
                  />
                ))}
              </>
            ) : null}

            {thisWeekSorted.length > 0 || weekly ? (
              <>
                <SectionTitle
                  emoji="📅"
                  text={t('notifications.sectionThisWeek')}
                  theme={theme}
                />
                {weekly ? (
                  <WeeklyCard
                    block={weekly}
                    theme={theme}
                    onOpenAttendance={goToAttendance}
                  />
                ) : null}
                {thisWeekSorted.map((item) => (
                  <NotifCard
                    key={item.id}
                    item={item}
                    theme={theme}
                    onViewDetails={() => openDetails(item)}
                  />
                ))}
              </>
            ) : null}

            {earlierSorted.length > 0 ? (
              <>
                <SectionTitle
                  emoji="📆"
                  text={t('notifications.sectionEarlier')}
                  theme={theme}
                />
                {earlierSorted.map((item) => (
                  <NotifCard
                    key={item.id}
                    item={item}
                    theme={theme}
                    onViewDetails={() => openDetails(item)}
                  />
                ))}
              </>
            ) : null}

            {older.length > 0 ? (
              <Button
                mode="outlined"
                onPress={() => setShowOlder((v) => !v)}
                style={styles.loadMoreBtn}
              >
                {showOlder
                  ? t('notifications.hideOlder')
                  : t('notifications.showOlder', {
                      count: older.length,
                      days: NOTIFICATION_RECENT_DAYS,
                    })}
              </Button>
            ) : null}

            {hasMore ? (
              <Button
                mode="outlined"
                onPress={() => void loadMore()}
                loading={loadingMore}
                disabled={loadingMore}
                style={styles.loadMoreBtn}
              >
                {t('attendance.loadMore')}
              </Button>
            ) : null}
          </>
        )}

        {feedItems.length === 0 && older.length > 0 ? (
          <Button
            mode="contained-tonal"
            onPress={() => setShowOlder(true)}
            style={styles.loadMoreBtn}
          >
            {t('notifications.showOlder', {
              count: older.length,
              days: NOTIFICATION_RECENT_DAYS,
            })}
          </Button>
        ) : null}
      </ScrollView>
    </>
  );

  return (
    <View style={[styles.standalone, { backgroundColor: colors.background }]}>
      {hero}
      {body}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  standalone: { flex: 1 },
  embedded: { flex: 1 },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginTop: 4,
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  scroll: { paddingHorizontal: 16, paddingBottom: 36 },
  sectionTitle: {
    marginTop: 20,
    marginBottom: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  card: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTopLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  cardActions: { flexDirection: 'row', marginTop: 14 },
  actionBtn: { flex: 1 },
  weeklyCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  weeklyTop: { flexDirection: 'row', alignItems: 'center' },
  loadMoreBtn: { marginTop: 8, marginBottom: 16 },
});
