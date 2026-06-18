import React, { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import {
  addDays,
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

type Props = {
  monthAnchor: Date;
  rows: ParentAttendanceRow[];
  onSelectDay?: (date: Date) => void;
};

const WEEKDAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function dotColor(
  kind: ReturnType<typeof kindFromStatus>,
  theme: AppTheme
): string {
  if (kind === 'present') return theme.colors.success;
  if (kind === 'absent') return theme.colors.error;
  if (kind === 'late') return theme.colors.warning;
  if (kind === 'leave') return theme.palette.card4_base;
  return theme.colors.outline;
}

export function AttendanceCalendarView({
  monthAnchor,
  rows,
  onSelectDay,
}: Props) {
  const theme = useTheme() as AppTheme;

  const statusByDay = useMemo(() => {
    const map = new Map<string, ReturnType<typeof kindFromStatus>>();
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
          const isToday = isSameDay(day, new Date());
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
                  isToday && {
                    borderColor: theme.colors.primary,
                    borderWidth: 2,
                  },
                ]}
              >
                <Text
                  variant="labelMedium"
                  style={{
                    color: isToday
                      ? theme.colors.primary
                      : theme.colors.onSurface,
                    fontWeight: isToday ? '800' : '500',
                  }}
                >
                  {format(day, 'd')}
                </Text>
                {hasStatus ? (
                  <View
                    style={[
                      styles.dot,
                      { backgroundColor: dotColor(kind, theme) },
                    ]}
                  />
                ) : (
                  <View style={styles.dotPlaceholder} />
                )}
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
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 2,
  },
  dotPlaceholder: {
    width: 6,
    height: 6,
    marginTop: 2,
  },
});
