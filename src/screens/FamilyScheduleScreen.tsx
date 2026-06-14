import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, useTheme } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { format } from 'date-fns';
import { useFocusEffect } from '@react-navigation/native';
import {
  getMyStudents,
  getStudentSchedules,
  type ParentSchedule,
  type ParentStudent,
} from '../services/parent';
import { ScreenDecor } from '../components/ScreenDecor';
import { EmptyState } from '../components/EmptyState';
import { avatarHue, initials } from '../utils/attendanceVisuals';
import {
  formatScheduleTimeRange,
  schedulesForDate,
} from '../utils/scheduleHelpers';
import type { AppTheme } from '../theme';
import { useAppLanguage } from '../common';

type ChildSchedules = {
  student: ParentStudent;
  schedules: ParentSchedule[];
};

function ChildScheduleCard({
  item,
  theme,
}: {
  item: ChildSchedules;
  theme: AppTheme;
}) {
  const { t } = useAppLanguage();
  const hue = avatarHue(item.student.name);
  const avatarBg = `hsl(${hue} 45% 46%)`;
  const today = schedulesForDate(item.schedules, new Date());

  return (
    <View
      style={[
        styles.childBlock,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.outlineVariant,
        },
      ]}
    >
      <View style={styles.childHeader}>
        <View style={[styles.avatar, { backgroundColor: avatarBg }]}>
          <Text style={styles.avatarText}>{initials(item.student.name)}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text
            variant="titleMedium"
            style={{ color: theme.colors.onSurface, fontWeight: '700' }}
          >
            {item.student.name}
          </Text>
          <Text
            variant="bodySmall"
            style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}
            numberOfLines={2}
          >
            {item.student.batchNames?.length
              ? item.student.batchNames.join(' · ')
              : item.student.instituteName}
          </Text>
        </View>
      </View>

      {item.schedules.length === 0 ? (
        <View
          style={[
            styles.emptyToday,
            { borderColor: theme.colors.outlineVariant },
          ]}
        >
          <Text
            variant="bodyMedium"
            style={{ color: theme.colors.onSurfaceVariant }}
          >
            {t('schedule.noSchedulesForChild')}
          </Text>
        </View>
      ) : today.length === 0 ? (
        <View
          style={[
            styles.emptyToday,
            { borderColor: theme.colors.outlineVariant },
          ]}
        >
          <Text
            variant="bodyMedium"
            style={{ color: theme.colors.onSurfaceVariant }}
          >
            {t('schedule.noScheduleToday')}
          </Text>
          <Text
            variant="labelMedium"
            style={{ color: theme.colors.primary, marginTop: 6 }}
          >
            {t('schedule.moreClasses', { count: item.schedules.length })}
          </Text>
        </View>
      ) : (
        today.map((s) => (
          <View
            key={`${item.student.id}-${s.scheduleId}`}
            style={[
              styles.row,
              {
                borderColor: theme.colors.outlineVariant,
                backgroundColor: theme.colors.background,
              },
            ]}
          >
            <View
              style={[
                styles.timeBadge,
                { backgroundColor: theme.colors.primaryContainer },
              ]}
            >
              <Text
                variant="labelSmall"
                style={{ color: theme.colors.primary, fontWeight: '800' }}
              >
                {formatScheduleTimeRange(s)}
              </Text>
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text
                variant="titleSmall"
                style={{ color: theme.colors.onSurface, fontWeight: '700' }}
              >
                {s.batchName}
              </Text>
              <Text
                variant="bodySmall"
                style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}
              >
                {t('schedule.today')}
              </Text>
            </View>
          </View>
        ))
      )}
    </View>
  );
}

export function FamilyScheduleScreen() {
  const theme = useTheme() as AppTheme;
  const { t } = useAppLanguage();

  const [items, setItems] = useState<ChildSchedules[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const stRes = await getMyStudents();
      if (!stRes.status || !Array.isArray(stRes.data)) {
        setItems([]);
        setError(stRes.message || t('home.couldNotLoadStudents'));
        return;
      }

      const list = stRes.data;
      const withSchedules = await Promise.all(
        list.map(async (student) => {
          try {
            const schRes = await getStudentSchedules(student.id);
            const schedules =
              schRes.status && Array.isArray(schRes.data) ? schRes.data : [];
            return { student, schedules };
          } catch {
            return { student, schedules: [] as ParentSchedule[] };
          }
        })
      );
      setItems(withSchedules);
    } catch {
      setError(t('home.networkError'));
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const todayLine = useMemo(
    () => t('home.todayPrefix', { date: format(new Date(), 'MMM d, yyyy') }),
    [t]
  );
  const todayCount = useMemo(
    () =>
      items.reduce(
        (n, item) => n + schedulesForDate(item.schedules, new Date()).length,
        0
      ),
    [items]
  );

  if (loading) {
    return (
      <ScreenDecor>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text
            variant="bodyLarge"
            style={{ marginTop: 16, color: theme.colors.onSurfaceVariant }}
          >
            {t('schedule.loading')}
          </Text>
        </View>
      </ScreenDecor>
    );
  }

  return (
    <ScreenDecor>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void load();
            }}
            tintColor={theme.colors.primary}
          />
        }
      >
        <View style={styles.titleRow}>
          <MaterialCommunityIcons
            name="calendar-clock"
            size={24}
            color={theme.colors.primary}
          />
          <Text
            variant="titleLarge"
            style={{
              color: theme.colors.onBackground,
              fontWeight: '800',
              marginLeft: 10,
            }}
          >
            {t('schedule.familyTitle')}
          </Text>
        </View>
        <Text
          variant="bodyMedium"
          style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}
        >
          {todayLine}
        </Text>
        <Text
          variant="labelMedium"
          style={{ color: theme.colors.primary, marginTop: 6 }}
        >
          {t('schedule.todayClassesCount', { count: todayCount })}
        </Text>

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
              style={{
                color: theme.colors.onErrorContainer,
                marginLeft: 8,
                flex: 1,
              }}
            >
              {error}
            </Text>
          </View>
        ) : null}

        {items.length === 0 && !error ? (
          <EmptyState
            icon="account-child-outline"
            title={t('home.noStudentsTitle')}
            message={t('home.noStudentsMessage')}
          />
        ) : (
          items.map((item) => (
            <ChildScheduleCard
              key={item.student.id}
              item={item}
              theme={theme}
            />
          ))
        )}
      </ScrollView>
    </ScreenDecor>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 20, paddingBottom: 36, marginTop: 12 },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  errBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginTop: 16,
  },
  childBlock: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    marginTop: 16,
  },
  childHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  emptyToday: {
    borderWidth: 1,
    borderRadius: 12,
    borderStyle: 'dashed',
    padding: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
  },
  timeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    minWidth: 88,
    alignItems: 'center',
  },
});
