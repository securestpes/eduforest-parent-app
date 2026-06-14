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
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Text, useTheme } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import { formatLocalDateTime } from '../utils/localDateTime';
import {
  getMyStudents,
  getStudentAttendance,
  type ParentAttendanceRow,
  ParentStudent,
} from '../services/parent';
import { useSelectionStore } from '../store/selectionStore';
import { ScreenDecor } from '../components/ScreenDecor';
import { EmptyState } from '../components/EmptyState';
import {
  buildWeeklySummary,
  collectCenterNotifications,
  splitNotificationsByRecency,
  type CenterNotification,
  type WeeklySummaryBlock,
} from '../utils/notificationCenter';
import type { AppTheme } from '../theme';
import type { RootStackParamList } from '../navigation/Navigation';
import { APP_NOTIFICATION_RECEIVED_EVENT } from '../constants/notifications';
import { useAppLanguage } from '../common';

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
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.outlineVariant,
          borderLeftWidth: 1,
          borderLeftColor: theme.colors.outlineVariant,
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
          fontWeight: '700',
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
          icon="calendar-check"
        >
          {t('notifications.viewDetails')}
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

export function NotificationsScreen({
  embedded,
  onSwitchToAttendance,
}: {
  embedded?: boolean;
  onSwitchToAttendance?: () => void;
} = {}) {
  const theme = useTheme() as AppTheme;
  const { t } = useAppLanguage();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const selectedStudentId = useSelectionStore((s) => s.selectedStudentId);
  const setSelectedStudentId = useSelectionStore((s) => s.setSelectedStudentId);

  const [students, setStudents] = useState<ParentStudent[]>([]);
  const [rowsMap, setRowsMap] = useState<Map<number, ParentAttendanceRow[]>>(
    new Map()
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);

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

  const allItems = useMemo(
    () => collectCenterNotifications(students, rowsMap, t),
    [students, rowsMap, t]
  );
  const selectedStudent = useMemo(
    () => students.find((s) => s.id === selectedStudentId) ?? null,
    [students, selectedStudentId]
  );
  const visibleItems = useMemo(() => {
    if (!embedded || !selectedStudent) return allItems;
    return allItems.filter((n) => n.studentName === selectedStudent.name);
  }, [allItems, embedded, selectedStudent]);
  const { today, thisWeekNotToday, earlier } = useMemo(
    () => splitNotificationsByRecency(visibleItems),
    [visibleItems]
  );
  const todaySorted = useMemo(
    () => [...today].sort((a, b) => b.at.getTime() - a.at.getTime()),
    [today]
  );
  const thisWeekSorted = useMemo(
    () => [...thisWeekNotToday].sort((a, b) => b.at.getTime() - a.at.getTime()),
    [thisWeekNotToday]
  );
  const earlierSorted = useMemo(
    () => [...earlier].sort((a, b) => b.at.getTime() - a.at.getTime()),
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
    if (embedded && onSwitchToAttendance) {
      onSwitchToAttendance();
      return;
    }
    navigation.navigate('ChildHub', {
      section: 'attendance',
      studentId: selectedStudentId ?? undefined,
    });
  };

  const openDetails = (item: CenterNotification) => {
    const student = students.find((s) => s.name === item.studentName);
    if (student) setSelectedStudentId(student.id);
    goToAttendance();
  };

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
    if (embedded) return <View style={styles.embedded}>{loader}</View>;
    return (
      <ScreenDecor>
        <SafeAreaView style={styles.safe} edges={['top']}>
          {loader}
        </SafeAreaView>
      </ScreenDecor>
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
        ) : visibleItems.length === 0 ? (
          <EmptyState
            icon="bell-sleep-outline"
            title={t('notifications.emptyNoActivityTitle')}
            message={t('notifications.emptyNoActivityMessage')}
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
          </>
        )}
      </ScrollView>
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
});
