import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  DeviceEventEmitter,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
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
import { Badge } from '../components/ui/Badge';
import {
  applyUnreadFlags,
  buildWeeklySummary,
  collectCenterNotifications,
  NOTIFICATION_RECENT_DAYS,
  partitionRecentAndOlder,
  sortNotificationsUnreadFirst,
  splitNotificationsByRecency,
  type CenterNotification,
  type CenterNotificationKind,
  type NotifAccent,
  type WeeklySummaryBlock,
} from '../utils/notificationCenter';
import { StudentModuleHero } from '../components/layout/StudentModuleHero';
import { navigateToChildScreen, navigateToTab } from '../navigation/navigationRef';
import type { RootStackParamList } from '../navigation/Navigation';
import { APP_NOTIFICATION_RECEIVED_EVENT } from '../constants/notifications';
import { useAppLanguage, type TranslationKey } from '../common';
import {
  getNotificationsLastOpenedAt,
  markNotificationsOpenedNow,
} from '../services/notificationReadState';
import { useParentTheme } from '../theme/useParentTheme';
import type { ModuleAccent, ParentHomeTheme } from '../theme/parentHomeTheme';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

function kindAccent(
  kind: CenterNotificationKind,
  colors: ParentHomeTheme['colors']
): ModuleAccent {
  if (kind === 'homework') return colors.modules.homework;
  if (kind === 'exam_results') return colors.modules.exams;
  if (kind === 'leave_status') return colors.modules.leaves;
  if (kind === 'fee_payment' || kind === 'fee_reminder') return colors.modules.fees;
  return colors.modules.attendance;
}

function kindIcon(kind: CenterNotificationKind): IconName {
  if (kind === 'homework') return 'book-open-page-variant-outline';
  if (kind === 'exam_results') return 'clipboard-text-outline';
  if (kind === 'leave_status') return 'calendar-account-outline';
  if (kind === 'fee_payment' || kind === 'fee_reminder') return 'currency-inr';
  return 'calendar-check';
}

function actionLabel(
  kind: CenterNotificationKind,
  t: (key: TranslationKey, params?: Record<string, string | number>) => string
): string {
  if (kind === 'exam_results') return t('notifications.viewExams');
  if (kind === 'leave_status') return t('notifications.viewLeaves');
  if (kind === 'homework') return t('notifications.viewHomework');
  if (kind === 'fee_payment' || kind === 'fee_reminder') return t('notifications.viewFees');
  return t('notifications.viewDetails');
}

function badgeTone(accent: NotifAccent): 'success' | 'warning' | 'danger' | 'primary' {
  if (accent === 'danger') return 'danger';
  if (accent === 'warning') return 'warning';
  if (accent === 'success') return 'success';
  return 'primary';
}

function NotifCard({
  item,
  onPress,
}: {
  item: CenterNotification;
  onPress: () => void;
}) {
  const { t } = useAppLanguage();
  const { colors, typography, shadows, radius } = useParentTheme();
  const accent = kindAccent(item.kind, colors);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${item.headline}. ${actionLabel(item.kind, t)}`}
      style={({ pressed }) => [
        styles.card,
        shadows.card,
        {
          backgroundColor: item.unread ? accent.card : colors.surface,
          borderColor: item.unread ? accent.well : colors.border,
          opacity: pressed ? 0.92 : 1,
          borderRadius: radius.card,
        },
      ]}
    >
      <View style={[styles.unreadBar, { backgroundColor: item.unread ? accent.icon : 'transparent' }]} />
      <View style={[styles.iconWell, { backgroundColor: accent.well }]}>
        <MaterialCommunityIcons name={kindIcon(item.kind)} size={20} color={accent.icon} />
      </View>
      <View style={styles.cardBody}>
        <View style={styles.cardTop}>
          <View style={styles.badges}>
            <Badge label={item.statusLabel} tone={badgeTone(item.accent)} />
            {item.unread ? <Badge label={t('notifications.newBadge')} tone="primary" /> : null}
          </View>
          <Text style={[typography.time, { color: colors.textTertiary }]}>{item.timeLabel}</Text>
        </View>
        <Text
          style={[
            typography.cardTitle,
            { color: colors.text, marginTop: 8, fontWeight: item.unread ? '800' : '700' },
          ]}
          numberOfLines={2}
        >
          {item.headline}
        </Text>
        <Text
          style={[typography.meta, { color: colors.textSecondary, marginTop: 4 }]}
          numberOfLines={2}
        >
          {item.detail}
        </Text>
        <View style={styles.ctaRow}>
          <Text style={[typography.meta, { color: colors.primary, fontWeight: '700' }]}>
            {actionLabel(item.kind, t)}
          </Text>
          <MaterialCommunityIcons name="chevron-right" size={18} color={colors.primary} />
        </View>
      </View>
    </Pressable>
  );
}

function WeeklyCard({
  block,
  onOpenAttendance,
}: {
  block: WeeklySummaryBlock;
  onOpenAttendance: () => void;
}) {
  const { t } = useAppLanguage();
  const { colors, typography, shadows, radius } = useParentTheme();
  const accent = colors.modules.attendance;

  return (
    <Pressable
      onPress={onOpenAttendance}
      accessibilityRole="button"
      accessibilityLabel={t('notifications.viewFullReport')}
      style={({ pressed }) => [
        styles.weeklyCard,
        shadows.card,
        {
          backgroundColor: accent.card,
          borderRadius: radius.card,
          opacity: pressed ? 0.94 : 1,
        },
      ]}
    >
      <View style={styles.weeklyTop}>
        <View style={[styles.iconWell, { backgroundColor: accent.well }]}>
          <MaterialCommunityIcons name="chart-box-outline" size={20} color={accent.icon} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[typography.cardTitle, { color: colors.text }]} numberOfLines={1}>
            {t('home.statsThisWeek')}
          </Text>
          <Text style={[typography.meta, { color: colors.textSecondary, marginTop: 2 }]}>
            {block.dateStr}
          </Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={22} color={accent.icon} />
      </View>

      {block.students.map((row) => (
        <View key={row.name} style={styles.weeklyStudent}>
          <Text style={[typography.meta, { color: colors.text, fontWeight: '700' }]} numberOfLines={1}>
            {row.name}
          </Text>
          <View style={styles.statChips}>
            <View style={[styles.statChip, { backgroundColor: colors.successSoft }]}>
              <Text style={[typography.badge, { color: colors.success }]}>
                {t('attendance.countPresent', { n: row.present })}
              </Text>
            </View>
            <View style={[styles.statChip, { backgroundColor: colors.dangerSoft }]}>
              <Text style={[typography.badge, { color: colors.danger }]}>
                {t('attendance.countAbsent', { n: row.absent })}
              </Text>
            </View>
            <View style={[styles.statChip, { backgroundColor: colors.warningSoft }]}>
              <Text style={[typography.badge, { color: colors.warning }]}>
                {t('attendance.countLate', { n: row.late })}
              </Text>
            </View>
          </View>
        </View>
      ))}

      <Text style={[typography.meta, { color: colors.primary, fontWeight: '700', marginTop: 4 }]}>
        {t('notifications.viewFullReport')}
      </Text>
    </Pressable>
  );
}

function SectionTitle({
  icon,
  text,
}: {
  icon: IconName;
  text: string;
}) {
  const { colors, typography } = useParentTheme();
  return (
    <View style={styles.sectionHead}>
      <View style={[styles.sectionIcon, { backgroundColor: colors.primarySoft }]}>
        <MaterialCommunityIcons name={icon} size={14} color={colors.primary} />
      </View>
      <Text style={[typography.section, { color: colors.text }]}>{text}</Text>
    </View>
  );
}

function ThemeButton({
  label,
  onPress,
  loading,
  filled,
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
  filled?: boolean;
}) {
  const { colors, typography, radius } = useParentTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.themeBtn,
        {
          borderRadius: radius.md,
          backgroundColor: filled ? colors.primarySoft : colors.surface,
          borderColor: filled ? colors.primarySoft : colors.border,
          opacity: pressed || loading ? 0.7 : 1,
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={colors.primary} />
      ) : (
        <Text style={[typography.meta, { color: colors.primary, fontWeight: '700' }]}>{label}</Text>
      )}
    </Pressable>
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
  const { colors, typography } = useParentTheme();
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
    return (
      <View style={[styles.standalone, { backgroundColor: colors.background }]}>
        {hero}
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[typography.body, { marginTop: 14, color: colors.textSecondary }]}>
            {t('notifications.loading')}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.standalone, { backgroundColor: colors.background }]}>
      {hero}
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
            tintColor={colors.primary}
          />
        }
      >
        {lastUpdatedLabel ? (
          <Text style={[typography.meta, { color: colors.textTertiary, marginBottom: 8 }]}>
            {lastUpdatedLabel}
          </Text>
        ) : null}

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
                <SectionTitle icon="white-balance-sunny" text={t('notifications.sectionToday')} />
                {todaySorted.map((item) => (
                  <NotifCard
                    key={item.id}
                    item={item}
                    onPress={() => openDetails(item)}
                  />
                ))}
              </>
            ) : null}

            {thisWeekSorted.length > 0 || weekly ? (
              <>
                <SectionTitle icon="calendar-week" text={t('notifications.sectionThisWeek')} />
                {weekly ? (
                  <WeeklyCard block={weekly} onOpenAttendance={goToAttendance} />
                ) : null}
                {thisWeekSorted.map((item) => (
                  <NotifCard
                    key={item.id}
                    item={item}
                    onPress={() => openDetails(item)}
                  />
                ))}
              </>
            ) : null}

            {earlierSorted.length > 0 ? (
              <>
                <SectionTitle icon="history" text={t('notifications.sectionEarlier')} />
                {earlierSorted.map((item) => (
                  <NotifCard
                    key={item.id}
                    item={item}
                    onPress={() => openDetails(item)}
                  />
                ))}
              </>
            ) : null}

            {older.length > 0 ? (
              <ThemeButton
                label={
                  showOlder
                    ? t('notifications.hideOlder')
                    : t('notifications.showOlder', {
                        count: older.length,
                        days: NOTIFICATION_RECENT_DAYS,
                      })
                }
                onPress={() => setShowOlder((v) => !v)}
              />
            ) : null}

            {hasMore ? (
              <ThemeButton
                label={t('attendance.loadMore')}
                onPress={() => void loadMore()}
                loading={loadingMore}
              />
            ) : null}
          </>
        )}

        {feedItems.length === 0 && older.length > 0 ? (
          <ThemeButton
            filled
            label={t('notifications.showOlder', {
              count: older.length,
              days: NOTIFICATION_RECENT_DAYS,
            })}
            onPress={() => setShowOlder(true)}
          />
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  standalone: { flex: 1 },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  scroll: { paddingHorizontal: 16, paddingBottom: 40 },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 18,
    marginBottom: 12,
  },
  sectionIcon: {
    width: 24,
    height: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 14,
    paddingLeft: 12,
    marginBottom: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  unreadBar: {
    width: 3,
    alignSelf: 'stretch',
    borderRadius: 99,
    marginRight: -4,
  },
  iconWell: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: { flex: 1, minWidth: 0 },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  badges: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, flexWrap: 'wrap' },
  ctaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 2,
  },
  weeklyCard: {
    padding: 14,
    marginBottom: 12,
    gap: 12,
  },
  weeklyTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  weeklyStudent: { gap: 8 },
  statChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  statChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  themeBtn: {
    marginTop: 8,
    marginBottom: 12,
    minHeight: 44,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
});
