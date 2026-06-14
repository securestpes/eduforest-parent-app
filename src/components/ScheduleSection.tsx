import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { ParentSchedule } from '../services/parent';
import {
  formatScheduleTimeRange,
  schedulesForDate,
} from '../utils/scheduleHelpers';
import type { AppTheme } from '../theme';
import { useAppLanguage } from '../common';

type Props = {
  schedules: ParentSchedule[];
};

export function ScheduleSection({ schedules }: Props) {
  const theme = useTheme() as AppTheme;
  const { t } = useAppLanguage();
  const today = schedulesForDate(schedules, new Date());

  if (schedules.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <MaterialCommunityIcons
          name="calendar-clock"
          size={20}
          color={theme.colors.primary}
        />
        <Text
          variant="titleMedium"
          style={{
            color: theme.colors.onBackground,
            fontWeight: '700',
            marginLeft: 8,
          }}
        >
          {t('schedule.title')}
        </Text>
      </View>

      {today.length === 0 ? (
        <View
          style={[
            styles.empty,
            {
              borderColor: theme.colors.outlineVariant,
              backgroundColor: theme.colors.surface,
            },
          ]}
        >
          <Text
            variant="bodyMedium"
            style={{ color: theme.colors.onSurfaceVariant }}
          >
            {t('schedule.noScheduleToday')}
          </Text>
        </View>
      ) : (
        today.map((s) => (
          <View
            key={s.scheduleId}
            style={[
              styles.row,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.outlineVariant,
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

      {schedules.length > today.length ? (
        <Text
          variant="labelMedium"
          style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}
        >
          {t('schedule.moreClasses', {
            count: schedules.length - today.length,
          })}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 24 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  empty: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    borderStyle: 'dashed',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
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
