import React, { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import {
  eachDayOfInterval,
  endOfMonth,
  format,
  getDay,
  isSameDay,
  startOfMonth,
} from 'date-fns';
import type { ParentAttendanceRow } from '../services/parent';
import { kindFromStatus, parseRowDate } from '../utils/dashboardHome';
import type { AppTheme } from '../theme';
import { EduForestColors } from '../theme/eduForestTokens';

type Props = {
  monthAnchor: Date;
  rows: ParentAttendanceRow[];
  onSelectDay?: (date: Date) => void;
  selectedDay?: Date | null;
};

const WEEKDAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

type StatusKind = ReturnType<typeof kindFromStatus>;

function statusColors(kind: StatusKind): { base: string; light: string } {
  switch (kind) {
    case 'present':
      return {
        base: EduForestColors.success,
        light: EduForestColors.successLight,
      };
    case 'late':
      return {
        base: EduForestColors.warning,
        light: EduForestColors.warningLight,
      };
    case 'absent':
      return {
        base: EduForestColors.danger,
        light: EduForestColors.dangerLight,
      };
    case 'leave':
      return {
        base: EduForestColors.secondary,
        light: EduForestColors.secondaryLight,
      };
    default:
      return {
        base: EduForestColors.textTertiary,
        light: EduForestColors.borderLight,
      };
  }
}

export function AttendanceCalendarView({
  monthAnchor,
  rows,
  onSelectDay,
  selectedDay,
}: Props) {
  const theme = useTheme() as AppTheme;

  const statusByDay = useMemo(() => {
    const map = new Map<string, StatusKind>();
    for (const row of rows) {
      const dt = parseRowDate(row);
      if (!dt) continue;
      const key = format(dt, 'yyyy-MM-dd');
      const kind = kindFromStatus(row.status);
      const prev = map.get(key);
      if (
        !prev ||
        kind === 'absent' ||
        (kind === 'late' && prev === 'present')
      ) {
        map.set(key, kind);
      }
    }
    return map;
  }, [rows]);

  const gridDays = useMemo(() => {
    const start = startOfMonth(monthAnchor);
    const end = endOfMonth(monthAnchor);
    const days = eachDayOfInterval({ start, end });
    const padStart = (getDay(start) + 6) % 7;
    const padded: (Date | null)[] = Array.from(
      { length: padStart },
      () => null
    );
    return [...padded, ...days];
  }, [monthAnchor]);

  return (
    <View
      style={[
        styles.wrap,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.outlineVariant,
        },
      ]}
    >
      <View style={styles.weekRow}>
        {WEEKDAY_LABELS.map((label, i) => (
          <Text
            key={`${label}-${i}`}
            variant="labelSmall"
            style={[styles.weekLabel, { color: theme.colors.onSurfaceVariant }]}
          >
            {label}
          </Text>
        ))}
      </View>
      <View style={styles.grid}>
        {gridDays.map((day, idx) => {
          if (!day) {
            return <View key={`empty-${idx}`} style={styles.cell} />;
          }
          const key = format(day, 'yyyy-MM-dd');
          const kind = statusByDay.get(key) ?? 'unknown';
          const colors = statusColors(kind);
          const isToday = isSameDay(day, new Date());
          const isSelected = selectedDay ? isSameDay(day, selectedDay) : false;
          const hasStatus = kind !== 'unknown';
          return (
            <Pressable
              key={key}
              style={styles.cell}
              onPress={() => onSelectDay?.(day)}
              accessibilityRole="button"
              accessibilityLabel={format(day, 'MMMM d')}
            >
              <View
                style={[
                  styles.dayCircle,
                  hasStatus && { backgroundColor: colors.base },
                  isToday && !hasStatus && styles.dayCircleToday,
                  isToday && hasStatus && styles.dayCircleTodayOnStatus,
                  isSelected && !hasStatus && styles.dayCircleSelected,
                  isSelected && hasStatus && styles.dayCircleSelectedOnStatus,
                ]}
              >
                <Text
                  variant="labelMedium"
                  style={[
                    styles.dayNumber,
                    {
                      color: hasStatus
                        ? '#FFFFFF'
                        : isToday
                          ? theme.colors.primary
                          : theme.colors.onSurface,
                      fontWeight: hasStatus || isToday ? '700' : '500',
                    },
                  ]}
                >
                  {format(day, 'd')}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    marginBottom: 12,
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekLabel: {
    flex: 1,
    textAlign: 'center',
    fontWeight: '700',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: `${100 / 7}%`,
    alignItems: 'center',
    paddingVertical: 4,
  },
  dayCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCircleToday: {
    borderColor: EduForestColors.primary,
    borderWidth: 2,
  },
  dayCircleTodayOnStatus: {
    borderColor: '#FFFFFF',
    borderWidth: 2,
  },
  dayCircleSelected: {
    borderColor: EduForestColors.primary,
    borderWidth: 2,
  },
  dayCircleSelectedOnStatus: {
    borderColor: '#FFFFFF',
    borderWidth: 2,
  },
  dayNumber: {
    textAlign: 'center',
  },
});
