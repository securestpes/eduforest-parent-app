import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
  ComponentProps,
} from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, useTheme } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NavigationProp } from '@react-navigation/native';
import { format } from 'date-fns';
import { useSelector } from 'react-redux';
import {
  getMe,
  getMyStudents,
  getStudentAttendance,
  getStudentSchedules,
  PARENT_ATTENDANCE_PAGE_SIZE,
  ParentAttendanceRow,
  ParentSchedule,
  ParentStudent,
} from '../services/parent';
import { useSelectionStore } from '../store/selectionStore';
import { ScreenDecor } from '../components/ScreenDecor';
import { EmptyState } from '../components/EmptyState';
import { initials, avatarHue } from '../utils/attendanceVisuals';
import {
  aggregateFamilyWeekStats,
  formatLastSessionLine,
  latestRow,
} from '../utils/dashboardHome';
import { formatLocalDateTime, formatApiTime } from '../utils/localDateTime';
import {
  formatScheduleTimeRange,
  resolveNextClassToday,
  resolveTodayStatus,
  type TodayStatusKind,
} from '../utils/scheduleHelpers';
import { useMainTabNavigation } from '../navigation/TabNavigationContext';
import { AppTheme } from '../theme';
import { RootState } from '../redux/store';
import { RootStackParamList } from '../navigation/Navigation';
import { useAppLanguage, TranslationKey } from '../common';

type Translate = (
  key: TranslationKey,
  params?: Record<string, string | number | undefined>
) => string;

function StatCard({
  icon,
  value,
  label,
  theme,
  tint,
}: {
  icon: ComponentProps<typeof MaterialCommunityIcons>['name'];
  value: string;
  label: string;
  theme: AppTheme;
  tint: 'success' | 'warning' | 'danger' | 'leave';
}) {
  const bg =
    tint === 'success'
      ? theme.palette.successSoft
      : tint === 'danger'
        ? theme.palette.dangerSoft
        : tint === 'leave'
          ? theme.palette.card4_alpha
          : theme.palette.warningSoft;
  const fg =
    tint === 'success'
      ? theme.colors.success
      : tint === 'danger'
        ? theme.colors.error
        : tint === 'leave'
          ? theme.palette.card4_base
          : theme.colors.warning;
  return (
    <View style={[styles.statCard, { backgroundColor: theme.colors.surface }]}>
      <View style={[styles.statIconWrap, { backgroundColor: bg }]}>
        <MaterialCommunityIcons name={icon} size={22} color={fg} />
      </View>
      <Text
        variant="headlineSmall"
        style={[styles.statValue, { color: theme.colors.onSurface }]}
      >
        {value}
      </Text>
      <Text
        variant="labelSmall"
        style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}
        numberOfLines={2}
        adjustsFontSizeToFit
        minimumFontScale={0.72}
      >
        {label}
      </Text>
    </View>
  );
}

function TodayStatusBadge({
  kind,
  theme,
}: {
  kind: TodayStatusKind;
  theme: AppTheme;
}) {
  const { t } = useAppLanguage();
  const label =
    kind === 'present'
      ? t('attendance.status.present')
      : kind === 'absent'
        ? t('attendance.status.absent')
        : kind === 'late'
          ? t('attendance.status.late')
          : kind === 'leave'
            ? t('attendance.status.leave')
            : kind === 'not_marked'
            ? t('home.todayNotMarked')
            : kind === 'no_class'
              ? t('home.todayNoClass')
              : t('common.dash');
  const bg =
    kind === 'present'
      ? theme.palette.successSoft
      : kind === 'absent'
        ? theme.palette.dangerSoft
        : kind === 'late'
          ? theme.palette.warningSoft
          : kind === 'leave'
            ? theme.palette.card4_alpha
            : kind === 'not_marked'
            ? theme.palette.primarySoft
            : theme.colors.surfaceVariant;
  const fg =
    kind === 'present'
      ? theme.colors.success
      : kind === 'absent'
        ? theme.colors.error
        : kind === 'late'
          ? theme.colors.warning
          : kind === 'leave'
            ? theme.palette.card4_base
            : kind === 'not_marked'
            ? theme.colors.primary
            : theme.colors.onSurfaceVariant;
  return (
    <View style={[styles.statusBadge, { backgroundColor: bg }]}>
      <View style={[styles.statusDot, { backgroundColor: fg }]} />
      <Text variant="labelSmall" style={{ color: fg, fontWeight: '700' }}>
        {label}
      </Text>
    </View>
  );
}

function childTodayDetailLine(
  kind: TodayStatusKind,
  todayRow: ParentAttendanceRow | null,
  schedules: ParentSchedule[],
  allRows: ParentAttendanceRow[],
  t: Translate
): string {
  if (kind === 'present' || kind === 'absent' || kind === 'late' || kind === 'leave') {
    if (todayRow) {
      const time = todayRow.startTime ? formatApiTime(todayRow.startTime) : '';
      return time
        ? `${todayRow.batchName} · ${time}`
        : todayRow.batchName;
    }
  }
  if (kind === 'not_marked') {
    const next = resolveNextClassToday(schedules);
    if (next.schedule && next.phase !== 'ended') {
      const range = formatScheduleTimeRange(next.schedule);
      if (next.phase === 'in_progress') {
        return t('home.inClassNow', {
          time: range,
          batch: next.schedule.batchName,
        });
      }
      return t('home.nextClass', {
        time: range,
        batch: next.schedule.batchName,
      });
    }
    return t('home.todayNotMarked');
  }
  const last = latestRow(allRows);
  return last ? formatLastSessionLine(last) : t('home.noAttendanceYet');
}

function ChildOverviewCard({
  item,
  onPress,
  theme,
  rows,
  schedules,
  t,
}: {
  item: ParentStudent;
  onPress: () => void;
  theme: AppTheme;
  rows: ParentAttendanceRow[];
  schedules: ParentSchedule[];
  t: Translate;
}) {
  const hue = avatarHue(item.name);
  const avatarBg = `hsl(${hue} 45% 46%)`;
  const { kind, row: todayRow } = resolveTodayStatus(schedules, rows);
  const batchLine = item.batchNames?.length
    ? item.batchNames.join(' · ')
    : t('common.dash');
  const detailLine = childTodayDetailLine(kind, todayRow, schedules, rows, t);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [{ opacity: pressed ? 0.94 : 1 }]}
    >
      <View
        style={[
          styles.childCard,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.outlineVariant,
            borderWidth: 1,
          },
        ]}
      >
        <View style={[styles.childAvatar, { backgroundColor: avatarBg }]}>
          <Text style={styles.childAvatarText}>{initials(item.name)}</Text>
        </View>
        <View style={styles.childCardBody}>
          <View style={styles.childTopRow}>
            <Text
              variant="titleMedium"
              style={[styles.childName, { color: theme.colors.onSurface }]}
              numberOfLines={1}
            >
              {item.name}
            </Text>
            <TodayStatusBadge kind={kind} theme={theme} />
          </View>
          <Text
            variant="bodySmall"
            style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}
            numberOfLines={2}
          >
            {item.instituteName}
          </Text>
          <Text
            variant="bodySmall"
            style={{ color: theme.colors.onSurfaceVariant, marginTop: 6 }}
            numberOfLines={2}
          >
            {batchLine} <Text style={{ color: theme.colors.outline }}>|</Text>{' '}
            {t('home.guardianLabel')} {item.guardianName}
          </Text>
          <View style={styles.lastRow}>
            <MaterialCommunityIcons
              name={
                kind === 'not_marked'
                  ? 'clock-outline'
                  : kind === 'leave'
                    ? 'beach'
                    : kind === 'no_class'
                      ? 'star-four-points-outline'
                      : 'calendar-check-outline'
              }
              size={16}
              color={
                kind === 'not_marked'
                  ? theme.colors.primary
                  : kind === 'leave'
                    ? theme.palette.card4_base
                    : kind === 'no_class'
                      ? theme.colors.warning
                      : theme.colors.success
              }
            />
            <Text
              variant="bodySmall"
              style={{
                color: theme.colors.onSurfaceVariant,
                marginLeft: 6,
                flex: 1,
              }}
              numberOfLines={2}
            >
              {detailLine}
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

export function HomeScreen() {
  const theme = useTheme() as AppTheme;
  const { t } = useAppLanguage();
  const { navigateToTab } = useMainTabNavigation();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const user = useSelector((s: RootState) => s.auth.user);

  const [students, setStudents] = useState<ParentStudent[]>([]);
  const [rowsByStudent, setRowsByStudent] = useState<
    Map<number, ParentAttendanceRow[]>
  >(new Map());
  const [schedulesByStudent, setSchedulesByStudent] = useState<
    Map<number, ParentSchedule[]>
  >(new Map());
  const [parentLabel, setParentLabel] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);

  const setSelected = useSelectionStore((s) => s.setSelectedStudentId);
  const selectedStudentId = useSelectionStore((s) => s.selectedStudentId);

  const load = useCallback(async () => {
    setError(null);
    try {
      let label = user?.name?.split(/\s+/)[0] ?? '';
      try {
        const meRes = await getMe();
        if (meRes.status && meRes.data && typeof meRes.data === 'object') {
          const d = meRes.data as { firstName?: string };
          if (d.firstName) label = d.firstName;
        }
      } catch {
        /* profile optional for greeting */
      }
      setParentLabel(label);

      const stRes = await getMyStudents();
      if (!stRes.status || !Array.isArray(stRes.data)) {
        setStudents([]);
        setRowsByStudent(new Map());
        setError(stRes.message || t('home.couldNotLoadStudents'));
        return;
      }

      const list = stRes.data;
      setStudents(list);

      const map = new Map<number, ParentAttendanceRow[]>();
      const schedMap = new Map<number, ParentSchedule[]>();
      await Promise.all(
        list.map(async (s) => {
          try {
            const [ar, sch] = await Promise.all([
              getStudentAttendance(s.id, 0, PARENT_ATTENDANCE_PAGE_SIZE),
              getStudentSchedules(s.id),
            ]);
            if (ar.status && ar.data?.content) map.set(s.id, ar.data.content);
            else map.set(s.id, []);
            if (sch.status && Array.isArray(sch.data)) {
              schedMap.set(s.id, sch.data);
            } else {
              schedMap.set(s.id, []);
            }
          } catch {
            map.set(s.id, []);
            schedMap.set(s.id, []);
          }
        })
      );
      setRowsByStudent(map);
      setSchedulesByStudent(schedMap);
      setLastUpdatedAt(Date.now());
    } catch {
      setError(t('home.networkError'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.name, t]);

  useEffect(() => {
    load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const weekStats = useMemo(
    () => aggregateFamilyWeekStats(rowsByStudent),
    [rowsByStudent]
  );

  const todayLine = useMemo(() => {
    const now = new Date();
    return t('home.todayPrefix', { date: format(now, 'MMM d, yyyy') });
  }, [t]);
  const lastUpdatedLabel = useMemo(() => {
    if (!lastUpdatedAt) return null;
    const secondsAgo = Math.floor((Date.now() - lastUpdatedAt) / 1000);
    if (secondsAgo < 60) return t('common.updatedJustNow');
    return t('common.updatedAt', {
      time: formatLocalDateTime(lastUpdatedAt),
    });
  }, [lastUpdatedAt, t]);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    const gm =
      h < 12
        ? t('greeting.morning')
        : h < 17
          ? t('greeting.afternoon')
          : t('greeting.evening');
    const name =
      parentLabel || user?.name?.split(/\s+/)[0] || t('common.parent');
    return t('home.waveGreeting', { greeting: gm, name });
  }, [parentLabel, user?.name, t]);

  const openChild = (id: number) => {
    setSelected(id);
    navigation.navigate('ChildHub', { studentId: id, section: 'attendance' });
  };

  const onRefreshPress = () => {
    if (refreshing || loading) return;
    setRefreshing(true);
    void load();
  };

  if (loading) {
    return (
      <ScreenDecor>
        <SafeAreaView style={styles.safe} edges={['top']}>
          <View style={styles.center}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text
              variant="bodyLarge"
              style={{ marginTop: 16, color: theme.colors.onSurfaceVariant }}
            >
              {t('home.loadingDashboard')}
            </Text>
          </View>
        </SafeAreaView>
      </ScreenDecor>
    );
  }

  return (
    <ScreenDecor>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
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
        <View style={styles.greetingRow}>
          <Text
            variant="titleLarge"
            style={[styles.greeting, { color: theme.colors.onBackground }]}
            numberOfLines={2}
          >
            👋 {greeting}
          </Text>
          <Pressable
            onPress={onRefreshPress}
            disabled={refreshing}
            accessibilityRole="button"
            accessibilityLabel={t('home.refresh')}
            style={({ pressed }) => [
              styles.refreshBtn,
              { opacity: pressed || refreshing ? 0.6 : 1 },
            ]}
          >
            {refreshing ? (
              <ActivityIndicator size="small" color={theme.colors.primary} />
            ) : (
              <MaterialCommunityIcons
                name="refresh"
                size={24}
                color={theme.colors.primary}
              />
            )}
          </Pressable>
        </View>

        <Text
          variant="bodyMedium"
          style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}
        >
          {todayLine}
        </Text>
        {lastUpdatedLabel ? (
          <Text
            variant="labelSmall"
            style={{ color: theme.colors.primary, marginTop: 4 }}
          >
            {lastUpdatedLabel}
          </Text>
        ) : null}

        {error ? (
          <View
            style={[
              styles.errBanner,
              { backgroundColor: theme.colors.errorContainer },
            ]}
          >
            <MaterialCommunityIcons
              name="alert-circle-outline"
              size={20}
              color={theme.colors.error}
            />
            <Text
              style={[styles.errText, { color: theme.colors.onErrorContainer }]}
            >
              {error}
            </Text>
          </View>
        ) : null}

        <View style={styles.statsRow}>
          <StatCard
            icon="check-decagram"
            value={String(weekStats.present)}
            label={t('home.statsPresentWeek')}
            theme={theme}
            tint="success"
          />
          <StatCard
            icon="close-circle-outline"
            value={String(weekStats.absent)}
            label={t('home.statsAbsentWeek')}
            theme={theme}
            tint="danger"
          />
          <StatCard
            icon="clock-alert-outline"
            value={String(weekStats.late)}
            label={t('home.statsLateWeek')}
            theme={theme}
            tint="warning"
          />
          <StatCard
            icon="beach"
            value={String(weekStats.leave)}
            label={t('home.statsLeaveWeek')}
            theme={theme}
            tint="leave"
          />
        </View>

        <View style={styles.sectionHeader}>
          <Text
            variant="titleMedium"
            style={{ color: theme.colors.onBackground, fontWeight: '700' }}
          >
            {t('home.myChildren')}
          </Text>
          <Text
            variant="labelMedium"
            style={{ color: theme.colors.onSurfaceVariant }}
          >
            {t('home.tapToOpen')}
          </Text>
        </View>

        {students.length === 0 && !error ? (
          <EmptyState
            icon="account-child-outline"
            title={t('home.noStudentsTitle')}
            message={t('home.noStudentsMessage')}
          />
        ) : (
          students.map((s) => (
            <ChildOverviewCard
              key={s.id}
              item={s}
              onPress={() => openChild(s.id)}
              theme={theme}
              rows={rowsByStudent.get(s.id) ?? []}
              schedules={schedulesByStudent.get(s.id) ?? []}
              t={t}
            />
          ))
        )}
      </ScrollView>
    </ScreenDecor>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 36, paddingTop: 12 },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },

  greeting: { fontWeight: '700', flex: 1 },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 12,
    paddingRight: 4,
  },
  refreshBtn: {
    padding: 8,
    marginTop: 2,
    minWidth: 40,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topIcons: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  iconBtn: { padding: 6 },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 20,
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    minWidth: 0,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  statIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  statValue: { fontWeight: '800' },
  statLabel: {
    marginTop: 4,
    textAlign: 'center',
    paddingHorizontal: 2,
    width: '100%',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 28,
    marginBottom: 12,
  },
  childCard: {
    flexDirection: 'row',
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 3,
  },
  childAvatar: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  childAvatarText: { color: '#fff', fontSize: 18, fontWeight: '800' },
  childCardBody: { flex: 1, marginLeft: 12 },
  childTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  childName: { fontWeight: '700', flex: 1 },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  lastRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  notifSection: { marginTop: 8 },
  notifCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  notifTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  notifDot: { width: 10, height: 10, borderRadius: 5 },
  notifEmpty: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  errBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 14,
    marginTop: 12,
  },
  errText: { flex: 1, fontSize: 14 },
});
