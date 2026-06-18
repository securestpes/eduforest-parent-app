import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type {
  ParentAttendanceRow,
  ParentSchedule,
  ParentStudent,
} from '../services/parent';
import {
  formatScheduleTimeRange,
  resolveNextClassToday,
  resolveTodayStatus,
  type TodayStatusKind,
} from '../utils/scheduleHelpers';
import { formatApiTime } from '../utils/localDateTime';
import type { AppTheme } from '../theme';
import { useAppLanguage, type TranslationKey } from '../common';

type Props = {
  student: ParentStudent | null;
  schedules: ParentSchedule[];
  rows: ParentAttendanceRow[];
  onPress?: () => void;
  compact?: boolean;
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
    case 'leave':
      return {
        label: t('attendance.status.leave'),
        icon: 'beach',
        bg: theme.palette.card4_alpha,
        fg: theme.palette.card4_base,
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

export function TodayHeroCard({
  student,
  schedules,
  rows,
  onPress,
  compact,
}: Props) {
  const theme = useTheme() as AppTheme;
  const { t } = useAppLanguage();

  if (!student) return null;

  const { kind, row, todaySchedules } = resolveTodayStatus(schedules, rows);
  const meta = statusMeta(kind, theme, t);
  const nextClass = resolveNextClassToday(schedules);

  const nextClassLine = (() => {
    if (kind === 'no_class' || !nextClass.schedule) return null;
    const range = formatScheduleTimeRange(nextClass.schedule);
    const batch = nextClass.schedule.batchName;
    if (nextClass.phase === 'in_progress') {
      return t('home.inClassNow', { time: range, batch });
    }
    if (nextClass.phase === 'upcoming') {
      return t('home.nextClass', { time: range, batch });
    }
    if (nextClass.phase === 'ended' && kind === 'not_marked') {
      return t('home.noMoreClassesToday');
    }
    return null;
  })();

  const content = (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.outlineVariant,
        },
        compact && styles.cardCompact,
      ]}
    >
      <View style={styles.titleRow}>
        <View style={{ flex: 1 }}>
          {!compact ? (
            <Text
              variant="labelLarge"
              style={{ color: theme.colors.onSurfaceVariant, fontWeight: '700' }}
            >
              {t('home.todayStatus')}
            </Text>
          ) : null}
          <Text
            variant="titleMedium"
            style={{
              color: theme.colors.onSurface,
              fontWeight: '800',
              marginTop: compact ? 0 : 4,
            }}
          >
            {student.name}
          </Text>
        </View>
        {onPress ? (
          <MaterialCommunityIcons
            name="chevron-right"
            size={24}
            color={theme.colors.outline}
          />
        ) : null}
      </View>

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
          {row.startTime ? ` · ${formatApiTime(row.startTime)}` : ''}
        </Text>
      ) : null}

      {nextClassLine ? (
        <Text
          variant="bodySmall"
          style={{ color: theme.colors.onSurfaceVariant, marginTop: 6 }}
        >
          {nextClassLine}
        </Text>
      ) : todaySchedules.length > 0 && kind === 'not_marked' && !nextClassLine ? (
        <Text
          variant="bodySmall"
          style={{ color: theme.colors.onSurfaceVariant, marginTop: 6 }}
        >
          {t('schedule.classTime')}:{' '}
          {formatScheduleTimeRange(todaySchedules[0])} ·{' '}
          {todaySchedules[0].batchName}
        </Text>
      ) : null}
    </View>
  );

  if (!onPress) return content;

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ opacity: pressed ? 0.94 : 1 }]}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  cardCompact: {
    marginBottom: 10,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
  },
});
