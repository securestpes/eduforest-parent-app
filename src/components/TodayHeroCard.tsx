import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type {
  ParentAttendanceRow,
  ParentSchedule,
  ParentStudent,
} from '../services/parent';
import {
  formatScheduleTimeRange,
  resolveTodayStatus,
  type TodayStatusKind,
} from '../utils/scheduleHelpers';
import type { AppTheme } from '../theme';
import { useAppLanguage, type TranslationKey } from '../common';

type Props = {
  student: ParentStudent | null;
  schedules: ParentSchedule[];
  rows: ParentAttendanceRow[];
};

function statusMeta(
  kind: TodayStatusKind,
  theme: AppTheme,
  t: (key: TranslationKey) => string
): {
  label: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  bg: string;
  fg: string;
} {
  switch (kind) {
    case 'present':
      return {
        label: t('home.todayPresent'),
        icon: 'check-circle',
        bg: theme.palette.successSoft,
        fg: theme.colors.success,
      };
    case 'absent':
      return {
        label: t('home.todayAbsent'),
        icon: 'close-circle',
        bg: theme.palette.dangerSoft,
        fg: theme.colors.error,
      };
    case 'late':
      return {
        label: t('home.todayLate'),
        icon: 'clock-alert',
        bg: theme.palette.warningSoft,
        fg: theme.colors.warning,
      };
    case 'not_marked':
      return {
        label: t('home.todayNotMarked'),
        icon: 'clock-outline',
        bg: theme.palette.primarySoft,
        fg: theme.colors.primary,
      };
    default:
      return {
        label: t('home.todayNoClass'),
        icon: 'calendar-remove',
        bg: theme.colors.surfaceVariant,
        fg: theme.colors.onSurfaceVariant,
      };
  }
}

export function TodayHeroCard({ student, schedules, rows }: Props) {
  const theme = useTheme() as AppTheme;
  const { t } = useAppLanguage();

  if (!student) return null;

  const { kind, row, todaySchedules } = resolveTodayStatus(schedules, rows);
  const meta = statusMeta(kind, theme, t);
  const nextSchedule = todaySchedules[0];

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.outlineVariant,
        },
      ]}
    >
      <Text
        variant="labelLarge"
        style={{ color: theme.colors.onSurfaceVariant, fontWeight: '700' }}
      >
        {t('home.todayStatus')}
      </Text>
      <Text
        variant="titleMedium"
        style={{
          color: theme.colors.onSurface,
          fontWeight: '800',
          marginTop: 4,
        }}
      >
        {student.name}
      </Text>

      <View style={[styles.statusRow, { backgroundColor: meta.bg }]}>
        <MaterialCommunityIcons name={meta.icon} size={22} color={meta.fg} />
        <Text
          variant="titleSmall"
          style={{ color: meta.fg, fontWeight: '800', marginLeft: 8, flex: 1 }}
        >
          {meta.label}
        </Text>
      </View>

      {row ? (
        <Text
          variant="bodySmall"
          style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}
        >
          {row.batchName}
          {row.startTime ? ` · ${row.startTime.slice(0, 5)}` : ''}
        </Text>
      ) : null}

      {nextSchedule && kind !== 'no_class' ? (
        <Text
          variant="bodySmall"
          style={{ color: theme.colors.onSurfaceVariant, marginTop: 6 }}
        >
          {t('schedule.classTime')}: {formatScheduleTimeRange(nextSchedule)} ·{' '}
          {nextSchedule.batchName}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginTop: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
  },
});
