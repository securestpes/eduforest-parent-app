import React, { useCallback, useEffect, useMemo, useRef, useState, type ComponentProps } from 'react';
import {
  ActivityIndicator,
  DeviceEventEmitter,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, useTheme } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { format } from 'date-fns';
import { useSelector } from 'react-redux';
import { getMe, getMyStudents, getStudentAttendance, type ParentAttendanceRow, type ParentStudent } from '../services/parent';
import { useSelectionStore } from '../store/selectionStore';
import { ScreenDecor } from '../components/ScreenDecor';
import { EmptyState } from '../components/EmptyState';
import { initials, avatarHue } from '../utils/attendanceVisuals';
import {
  aggregateFamilyStats,
  formatLastSessionLine,
  kindFromStatus,
  latestRow,
  notificationsFromAttendance,
  type DashboardNotif,
} from '../utils/dashboardHome';
import type { MainTabParamList } from '../navigation/MainTabs';
import type { AppTheme } from '../../theme';
import type { RootState } from '../../redux/store';
import { APP_NOTIFICATION_RECEIVED_EVENT } from '../constants/notifications';
import { useAppLanguage, type TranslationKey } from '../../common';

type Translate = (key: TranslationKey, params?: Record<string, string | number | undefined>) => string;

function StatCard({
  icon,
  value,
  label,
  sublabel,
  theme,
  tint,
}: {
  icon: ComponentProps<typeof MaterialCommunityIcons>['name'];
  value: string;
  label: string;
  sublabel: string;
  theme: AppTheme;
  tint: 'primary' | 'success' | 'warning';
}) {
  const bg =
    tint === 'primary'
      ? theme.colors.primaryContainer
      : tint === 'success'
        ? '#DCFCE7'
        : '#FEF3C7';
  const fg =
    tint === 'primary' ? theme.colors.primary : tint === 'success' ? theme.colors.success : theme.colors.warning;
  return (
    <View style={[styles.statCard, { backgroundColor: theme.colors.surface }]}>
      <View style={[styles.statIconWrap, { backgroundColor: bg }]}>
        <MaterialCommunityIcons name={icon} size={22} color={fg} />
      </View>
      <Text variant="headlineSmall" style={[styles.statValue, { color: theme.colors.onSurface }]}>
        {value}
      </Text>
      <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2, textAlign: 'center' }}>
        {label}
      </Text>
      <Text variant="labelSmall" style={{ color: theme.colors.outline, marginTop: 2, textAlign: 'center' }}>
        {sublabel}
      </Text>
    </View>
  );
}

function StatusBadge({ kind, theme }: { kind: ReturnType<typeof kindFromStatus>; theme: AppTheme }) {
  const { t } = useAppLanguage();
  const label =
    kind === 'present'
      ? t('attendance.status.present')
      : kind === 'absent'
        ? t('attendance.status.absent')
        : kind === 'late'
          ? t('attendance.status.late')
          : t('common.dash');
  const bg =
    kind === 'present'
      ? '#DCFCE7'
      : kind === 'absent'
        ? '#FEE2E2'
        : kind === 'late'
          ? '#FEF3C7'
          : theme.colors.surfaceVariant;
  const fg =
    kind === 'present' ? theme.colors.success : kind === 'absent' ? theme.colors.error : kind === 'late' ? theme.colors.warning : theme.colors.onSurfaceVariant;
  return (
    <View style={[styles.statusBadge, { backgroundColor: bg }]}>
      <View style={[styles.statusDot, { backgroundColor: fg }]} />
      <Text variant="labelSmall" style={{ color: fg, fontWeight: '700' }}>
        {label}
      </Text>
    </View>
  );
}

function ChildOverviewCard({
  item,
  selected,
  onSelect,
  theme,
  lastRow,
  t,
}: {
  item: ParentStudent;
  selected: boolean;
  onSelect: () => void;
  theme: AppTheme;
  lastRow: ParentAttendanceRow | null;
  t: Translate;
}) {
  const hue = avatarHue(item.name);
  const avatarBg = `hsl(${hue} 45% 46%)`;
  const kind = lastRow ? kindFromStatus(lastRow.status) : 'unknown';
  const batchLine = item.batchNames?.length ? item.batchNames.join(' · ') : t('common.dash');

  return (
    <Pressable onPress={onSelect} style={({ pressed }) => [{ opacity: pressed ? 0.94 : 1 }]}>
      <View
        style={[
          styles.childCard,
          {
            backgroundColor: theme.colors.surface,
            borderColor: selected ? theme.colors.primary : theme.colors.outlineVariant,
            borderWidth: selected ? 2 : 1,
          },
        ]}
      >
        <View style={[styles.childAvatar, { backgroundColor: avatarBg }]}>
          <Text style={styles.childAvatarText}>{initials(item.name)}</Text>
        </View>
        <View style={styles.childCardBody}>
          <View style={styles.childTopRow}>
            <Text variant="titleMedium" style={[styles.childName, { color: theme.colors.onSurface }]} numberOfLines={1}>
              {item.name}
            </Text>
            <StatusBadge kind={lastRow ? kind : 'unknown'} theme={theme} />
          </View>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }} numberOfLines={2}>
            {item.instituteName}
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 6 }} numberOfLines={2}>
            {batchLine} <Text style={{ color: theme.colors.outline }}>|</Text> {t('home.guardianLabel')}{' '}
            {item.guardianName}
          </Text>
          <View style={styles.lastRow}>
            <MaterialCommunityIcons name="star-four-points-outline" size={16} color={theme.colors.warning} />
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginLeft: 6, flex: 1 }}>
              {lastRow ? formatLastSessionLine(lastRow) : t('home.noAttendanceYet')}
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

function NotifRow({ n, theme }: { n: DashboardNotif; theme: AppTheme }) {
  const dot =
    n.accent === 'danger' ? theme.colors.error : n.accent === 'warning' ? theme.colors.warning : n.accent === 'success' ? theme.colors.success : theme.colors.primary;
  return (
    <View style={[styles.notifCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]}>
      <View style={styles.notifTop}>
        <View style={[styles.notifDot, { backgroundColor: dot }]} />
        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, flex: 1 }}>
          {n.timeLabel}
        </Text>
      </View>
      <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, fontWeight: '600', marginTop: 6 }}>
        {n.headline}
      </Text>
      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
        {n.detail}
      </Text>
    </View>
  );
}

export function HomeScreen() {
  const theme = useTheme() as AppTheme;
  const { t } = useAppLanguage();
  const navigation = useNavigation<BottomTabNavigationProp<MainTabParamList>>();
  const scrollRef = useRef<ScrollView>(null);
  const user = useSelector((s: RootState) => s.auth.user);

  const [students, setStudents] = useState<ParentStudent[]>([]);
  const [rowsByStudent, setRowsByStudent] = useState<Map<number, ParentAttendanceRow[]>>(new Map());
  const [parentLabel, setParentLabel] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);

  const selectedId = useSelectionStore((s) => s.selectedStudentId);
  const setSelected = useSelectionStore((s) => s.setSelectedStudentId);

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
      await Promise.all(
        list.map(async (s) => {
          try {
            const ar = await getStudentAttendance(s.id, 0, 80);
            if (ar.status && ar.data?.content) map.set(s.id, ar.data.content);
            else map.set(s.id, []);
          } catch {
            map.set(s.id, []);
          }
        })
      );
      setRowsByStudent(map);
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

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(
      APP_NOTIFICATION_RECEIVED_EVENT,
      () => {
        void load();
      }
    );
    return () => sub.remove();
  }, [load]);

  useEffect(() => {
    if (students.length === 0) return;
    if (!selectedId || !students.some((s) => s.id === selectedId)) {
      setSelected(students[0].id);
    }
  }, [students, selectedId, setSelected]);

  const stats = useMemo(() => aggregateFamilyStats(rowsByStudent), [rowsByStudent]);

  const notifications = useMemo(
    () => notificationsFromAttendance(students, rowsByStudent, 6),
    [students, rowsByStudent]
  );

  const todayLine = useMemo(() => {
    const now = new Date();
    return t('home.todayPrefix', { date: format(now, 'MMM d, yyyy') });
  }, [t]);
  const lastUpdatedLabel = useMemo(() => {
    if (!lastUpdatedAt) return null;
    const secondsAgo = Math.floor((Date.now() - lastUpdatedAt) / 1000);
    if (secondsAgo < 60) return t('common.updatedJustNow');
    return t('common.updatedAt', { time: format(new Date(lastUpdatedAt), 'hh:mm a') });
  }, [lastUpdatedAt, t]);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    const gm = h < 12 ? t('greeting.morning') : h < 17 ? t('greeting.afternoon') : t('greeting.evening');
    const name = parentLabel || user?.name?.split(/\s+/)[0] || t('common.parent');
    return t('home.waveGreeting', { greeting: gm, name });
  }, [parentLabel, user?.name, t]);

  const onViewAllChildren = () => {
    scrollRef.current?.scrollToEnd({ animated: true });
  };

  if (loading) {
    return (
      <ScreenDecor>
        <SafeAreaView style={styles.safe} edges={['top']}>
          <View style={styles.center}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text variant="bodyLarge" style={{ marginTop: 16, color: theme.colors.onSurfaceVariant }}>
              {t('home.loadingDashboard')}
            </Text>
          </View>
        </SafeAreaView>
      </ScreenDecor>
    );
  }

  return (
    <ScreenDecor>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView
          ref={scrollRef}
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
          <View style={styles.topBar}>
            <Text variant="titleMedium" style={[styles.greeting, { color: theme.colors.onBackground }]} numberOfLines={2}>
              👋 {greeting}
            </Text>
            <View style={styles.topIcons}>
              <Pressable hitSlop={12} onPress={() => navigation.navigate('Notifications')} style={styles.iconBtn}>
                <MaterialCommunityIcons name="bell-outline" size={24} color={theme.colors.onBackground} />
              </Pressable>
              <Pressable hitSlop={12} onPress={() => navigation.navigate('Profile')} style={styles.iconBtn}>
                <MaterialCommunityIcons name="account-circle-outline" size={26} color={theme.colors.onBackground} />
              </Pressable>
            </View>
          </View>

          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
            {todayLine}
          </Text>
          {lastUpdatedLabel ? (
            <Text variant="labelSmall" style={{ color: theme.colors.primary, marginTop: 4 }}>
              {lastUpdatedLabel}
            </Text>
          ) : null}

          {error ? (
            <View style={[styles.errBanner, { backgroundColor: theme.colors.errorContainer }]}>
              <MaterialCommunityIcons name="alert-circle-outline" size={20} color={theme.colors.error} />
              <Text style={[styles.errText, { color: theme.colors.onErrorContainer }]}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.statsRow}>
            <StatCard
              icon="chart-donut"
              value={`${stats.monthPct}%`}
              label={t('home.statsAttendance')}
              sublabel={t('home.statsThisMonth')}
              theme={theme}
              tint="primary"
            />
            <StatCard
              icon="check-decagram"
              value={String(stats.weekPresent)}
              label={t('home.statsPresent')}
              sublabel={t('home.statsThisWeek')}
              theme={theme}
              tint="success"
            />
            <StatCard
              icon="clock-alert-outline"
              value={String(stats.monthLate)}
              label={t('home.statsLateDays')}
              sublabel={t('home.statsThisMonth')}
              theme={theme}
              tint="warning"
            />
          </View>

          <View style={styles.sectionHeader}>
            <Text variant="titleMedium" style={{ color: theme.colors.onBackground, fontWeight: '700' }}>
              {t('home.myChildren')}
            </Text>
            {students.length > 0 ? (
              <Pressable onPress={onViewAllChildren}>
                <Text variant="labelLarge" style={{ color: theme.colors.primary, fontWeight: '600' }}>
                  {t('home.viewAll')}
                </Text>
              </Pressable>
            ) : null}
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
                selected={selectedId === s.id}
                onSelect={() => setSelected(s.id)}
                theme={theme}
                lastRow={latestRow(rowsByStudent.get(s.id) ?? [])}
                t={t}
              />
            ))
          )}

          <View style={styles.notifSection}>
            <View style={styles.sectionHeader}>
              <Text variant="titleMedium" style={{ color: theme.colors.onBackground, fontWeight: '700' }}>
                {t('home.recentNotifications')}
              </Text>
              <Pressable onPress={() => navigation.navigate('Notifications')}>
                <Text variant="labelMedium" style={{ color: theme.colors.primary, opacity: 0.85 }}>
                  {t('home.markAllRead')}
                </Text>
              </Pressable>
            </View>
            <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 8 }}>
              {t('home.fromLatestActivity')}
            </Text>

            {notifications.length === 0 ? (
              <View style={[styles.notifEmpty, { borderColor: theme.colors.outlineVariant }]}>
                <MaterialCommunityIcons name="bell-sleep-outline" size={36} color={theme.colors.outline} />
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', marginTop: 8 }}>
                  {t('home.noRecentActivity')}
                </Text>
              </View>
            ) : (
              notifications.map((n) => <NotifRow key={n.id} n={n} theme={theme} />)
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </ScreenDecor>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 36 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  topBar: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginTop: 4 },
  greeting: { flex: 1, fontWeight: '700', paddingRight: 8 },
  topIcons: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  iconBtn: { padding: 6 },
  statsRow: { flexDirection: 'row', gap: 10, marginTop: 20, justifyContent: 'space-between' },
  statCard: {
    flex: 1,
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
  childTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
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
