import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  DeviceEventEmitter,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Text, useTheme } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { format } from 'date-fns';
import { getMyStudents, getStudentAttendance, type ParentAttendanceRow, type ParentStudent } from '../services/parent';
import { loadReadNotificationIds, saveReadNotificationIds } from '../services/notificationReadStore';
import { ScreenDecor } from '../components/ScreenDecor';
import { EmptyState } from '../components/EmptyState';
import {
  buildWeeklySummary,
  collectCenterNotifications,
  splitNotificationsByRecency,
  type CenterNotification,
  type WeeklySummaryBlock,
} from '../utils/notificationCenter';
import type { MainTabParamList } from '../navigation/MainTabs';
import type { AppTheme } from '../../theme';
import { APP_NOTIFICATION_RECEIVED_EVENT } from '../constants/notifications';
import { useAppLanguage } from '../../common';

function accentColor(accent: CenterNotification['accent'], theme: AppTheme): string {
  if (accent === 'danger') return theme.colors.error;
  if (accent === 'warning') return theme.colors.warning;
  if (accent === 'success') return theme.colors.success;
  return theme.colors.primary;
}

function NotifCard({
  item,
  theme,
  unread,
  onViewDetails,
  onContact,
}: {
  item: CenterNotification;
  theme: AppTheme;
  unread: boolean;
  onViewDetails: () => void;
  onContact: () => void;
}) {
  const { t } = useAppLanguage();
  const dot = accentColor(item.accent, theme);
  const pillBg =
    item.accent === 'danger'
      ? theme.colors.errorContainer
      : item.accent === 'warning'
        ? theme.colors.secondaryContainer
        : item.accent === 'success'
          ? '#DCFCE7'
          : theme.colors.primaryContainer;
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.outlineVariant,
          borderLeftWidth: unread ? 4 : 1,
          borderLeftColor: unread ? dot : theme.colors.outlineVariant,
        },
      ]}
    >
      <View style={styles.cardTop}>
        <View style={[styles.statusPill, { backgroundColor: pillBg }]}>
          <Text variant="labelSmall" style={{ color: dot, fontWeight: '800' }}>
            {item.statusLabel}
          </Text>
        </View>
        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
          {item.timeLabel}
        </Text>
      </View>
      <Text variant="titleSmall" style={{ color: theme.colors.onSurface, fontWeight: '700', marginTop: 8 }}>
        {item.headline}
      </Text>
      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 6 }}>
        {item.detail}
      </Text>
      <View style={styles.cardActions}>
        <Button mode="outlined" compact onPress={onViewDetails} style={styles.halfBtn}>
          {t('notifications.viewDetails')}
        </Button>
        <Button mode="contained-tonal" compact onPress={onContact} style={styles.halfBtn}>
          {t('notifications.contactSchool')}
        </Button>
      </View>
    </View>
  );
}

function WeeklyCard({ block, theme, onOpenAttendance }: { block: WeeklySummaryBlock; theme: AppTheme; onOpenAttendance: () => void }) {
  const { t } = useAppLanguage();
  return (
    <Pressable
      onPress={onOpenAttendance}
      style={[styles.weeklyCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]}
    >
      <View style={styles.weeklyTop}>
        <MaterialCommunityIcons name="chart-box-outline" size={22} color={theme.colors.primary} />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text variant="titleSmall" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>
            {block.title}
          </Text>
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
            {block.dateStr}
          </Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={22} color={theme.colors.outline} />
      </View>
      {block.lines.map((line, idx) => (
        <Text key={`${idx}-${line}`} variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}>
          {line}
        </Text>
      ))}
      <Text variant="labelMedium" style={{ color: theme.colors.primary, marginTop: 10, fontWeight: '700' }}>
        {t('notifications.viewFullReport')}
      </Text>
    </Pressable>
  );
}

function SectionTitle({ emoji, text, theme }: { emoji: string; text: string; theme: AppTheme }) {
  return (
    <Text variant="labelLarge" style={[styles.sectionTitle, { color: theme.colors.onSurfaceVariant }]}>
      {emoji} {text}
    </Text>
  );
}

export function NotificationsScreen() {
  const theme = useTheme() as AppTheme;
  const { t } = useAppLanguage();
  const navigation = useNavigation<BottomTabNavigationProp<MainTabParamList>>();

  const [students, setStudents] = useState<ParentStudent[]>([]);
  const [rowsMap, setRowsMap] = useState<Map<number, ParentAttendanceRow[]>>(new Map());
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);

  const loadReads = useCallback(async () => {
    const s = await loadReadNotificationIds();
    setReadIds(s);
  }, []);

  const load = useCallback(async () => {
    try {
      const stRes = await getMyStudents();
      if (!stRes.status || !Array.isArray(stRes.data)) {
        setStudents([]);
        setRowsMap(new Map());
        return;
      }
      const list = stRes.data;
      setStudents(list);
      const map = new Map<number, ParentAttendanceRow[]>();
      await Promise.all(
        list.map(async (s) => {
          try {
            const ar = await getStudentAttendance(s.id, 0, 100);
            if (ar.status && ar.data?.content) map.set(s.id, ar.data.content);
            else map.set(s.id, []);
          } catch {
            map.set(s.id, []);
          }
        })
      );
      setRowsMap(map);
      setLastUpdatedAt(Date.now());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadReads();
  }, [loadReads]);

  useEffect(() => {
    load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      void loadReads();
      void load();
    }, [load, loadReads])
  );

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(
      APP_NOTIFICATION_RECEIVED_EVENT,
      () => {
        void loadReads();
        void load();
      }
    );
    return () => sub.remove();
  }, [load, loadReads]);

  const allItems = useMemo(() => collectCenterNotifications(students, rowsMap), [students, rowsMap]);
  const { today, thisWeekNotToday, earlier } = useMemo(() => splitNotificationsByRecency(allItems), [allItems]);
  const todaySorted = useMemo(() => [...today].sort((a, b) => b.at.getTime() - a.at.getTime()), [today]);
  const thisWeekSorted = useMemo(
    () => [...thisWeekNotToday].sort((a, b) => b.at.getTime() - a.at.getTime()),
    [thisWeekNotToday]
  );
  const earlierSorted = useMemo(() => [...earlier].sort((a, b) => b.at.getTime() - a.at.getTime()), [earlier]);
  const weekly = useMemo(() => buildWeeklySummary(students, rowsMap), [students, rowsMap]);

  const unreadCount = useMemo(
    () => allItems.filter((n) => !readIds.has(n.id)).length,
    [allItems, readIds]
  );
  const lastUpdatedLabel = useMemo(() => {
    if (!lastUpdatedAt) return null;
    const secondsAgo = Math.floor((Date.now() - lastUpdatedAt) / 1000);
    if (secondsAgo < 60) return t('common.updatedJustNow');
    return t('common.updatedAt', { time: format(new Date(lastUpdatedAt), 'hh:mm a') });
  }, [lastUpdatedAt, t]);

  const markAllRead = async () => {
    const next = new Set(readIds);
    allItems.forEach((n) => next.add(n.id));
    setReadIds(next);
    await saveReadNotificationIds(next);
  };

  const openContact = () =>
    Alert.alert(t('notifications.contactTitle'), t('notifications.contactMessage'));

  if (loading) {
    return (
      <ScreenDecor>
        <SafeAreaView style={styles.safe} edges={['top']}>
          <View style={styles.center}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text variant="bodyLarge" style={{ marginTop: 14, color: theme.colors.onSurfaceVariant }}>
              {t('notifications.loading')}
            </Text>
          </View>
        </SafeAreaView>
      </ScreenDecor>
    );
  }

  return (
    <ScreenDecor>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.headerRow}>
          <View style={styles.headerTitleWrap}>
            <MaterialCommunityIcons name="bell-ring-outline" size={22} color={theme.colors.primary} style={{ marginRight: 8 }} />
            <Text variant="titleLarge" style={{ color: theme.colors.onBackground, fontWeight: '800' }}>
              {t('notifications.title')}
            </Text>
          </View>
          <Pressable
            onPress={() => void markAllRead()}
            disabled={allItems.length === 0 || unreadCount === 0}
            style={{ opacity: allItems.length === 0 || unreadCount === 0 ? 0.45 : 1 }}
          >
            <Text variant="labelLarge" style={{ color: theme.colors.primary, fontWeight: '700' }}>
              {t('notifications.markAllRead')}
            </Text>
          </Pressable>
        </View>
        {unreadCount > 0 ? (
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 8 }}>
            {t('notifications.unread', { count: unreadCount })}
          </Text>
        ) : null}
        {lastUpdatedLabel ? (
          <Text variant="labelSmall" style={{ color: theme.colors.primary, marginBottom: 8 }}>
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
                void loadReads();
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
          ) : allItems.length === 0 ? (
            <EmptyState
              icon="bell-sleep-outline"
              title={t('notifications.emptyNoActivityTitle')}
              message={t('notifications.emptyNoActivityMessage')}
            />
          ) : (
            <>
              {todaySorted.length > 0 ? (
                <>
                  <SectionTitle emoji="🆕" text={t('notifications.sectionToday')} theme={theme} />
                  {todaySorted.map((item) => (
                    <NotifCard
                      key={item.id}
                      item={item}
                      theme={theme}
                      unread={!readIds.has(item.id)}
                      onViewDetails={() => navigation.navigate('Attendance')}
                      onContact={openContact}
                    />
                  ))}
                </>
              ) : null}

              {thisWeekSorted.length > 0 || weekly ? (
                <>
                  <SectionTitle emoji="📅" text={t('notifications.sectionThisWeek')} theme={theme} />
                  {weekly ? (
                    <WeeklyCard
                      block={weekly}
                      theme={theme}
                      onOpenAttendance={() => navigation.navigate('Attendance')}
                    />
                  ) : null}
                  {thisWeekSorted.map((item) => (
                    <NotifCard
                      key={item.id}
                      item={item}
                      theme={theme}
                      unread={!readIds.has(item.id)}
                      onViewDetails={() => navigation.navigate('Attendance')}
                      onContact={openContact}
                    />
                  ))}
                </>
              ) : null}

              {earlierSorted.length > 0 ? (
                <>
                  <SectionTitle emoji="📆" text={t('notifications.sectionEarlier')} theme={theme} />
                  {earlierSorted.map((item) => (
                    <NotifCard
                      key={item.id}
                      item={item}
                      theme={theme}
                      unread={!readIds.has(item.id)}
                      onViewDetails={() => navigation.navigate('Attendance')}
                      onContact={openContact}
                    />
                  ))}
                </>
              ) : null}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </ScreenDecor>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginTop: 4,
  },
  headerTitleWrap: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 },
  scroll: { paddingHorizontal: 16, paddingBottom: 36 },
  sectionTitle: { marginTop: 20, marginBottom: 10, fontWeight: '800', letterSpacing: 0.5 },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  cardActions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  halfBtn: { flex: 1 },
  weeklyCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  weeklyTop: { flexDirection: 'row', alignItems: 'center' },
});
