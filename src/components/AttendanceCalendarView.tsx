import React, { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
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
import { isDateInSession } from '../utils/academicSession';
import type { AppTheme } from '../theme';
import { EduForestColors } from '../theme/eduForestTokens';
import { useAppLanguage } from '../common';
import { formatAppDate, weekdayNarrowLabelsMondayFirst } from '../utils/appDateLocale';

type Props = {
  monthAnchor: Date;
  rows: ParentAttendanceRow[];
  onSelectDay?: (date: Date) => void;
  selectedDay?: Date | null;
  onPressMonth?: () => void;
  sessionRange?: { start: Date; end: Date } | null;
};

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
        base: EduForestColors.primary,
        light: EduForestColors.primaryLight,
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
  onPressMonth,
  sessionRange = null,
}: Props) {
  const theme = useTheme() as AppTheme;
  const { t, language } = useAppLanguage();
  const weekdayLabels = weekdayNarrowLabelsMondayFirst(language);

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
      <Pressable
        onPress={onPressMonth}
        disabled={!onPressMonth}
        style={styles.monthHead}
        accessibilityRole={onPressMonth ? 'button' : undefined}
      >
        <Text variant="titleSmall" style={[styles.monthTitle, { color: theme.colors.onSurface }]}>
          {formatAppDate(monthAnchor, 'MMMM yyyy', language)}
        </Text>
        {onPressMonth ? (
          <MaterialCommunityIcons name="chevron-down" size={20} color={theme.colors.primary} />
        ) : null}
      </Pressable>
      <View style={styles.weekRow}>
        {weekdayLabels.map((label, i) => (
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
          const inSession = isDateInSession(day, sessionRange);
          return (
            <Pressable
              key={key}
              style={[styles.cell, !inSession && { opacity: 0.35 }]}
              onPress={() => {
                if (!inSession) return;
                onSelectDay?.(day);
              }}
              disabled={!inSession}
              accessibilityRole="button"
              accessibilityLabel={formatAppDate(day, 'MMMM d', language)}
            >
                <View
                  style={[
                    styles.dayRing,
                    isSelected && {
                      borderColor: theme.colors.primary,
                      borderWidth: 2,
                    },
                  ]}
                >
                <View
                  style={[
                    styles.dayDot,
                    hasStatus && { backgroundColor: colors.base },
                  ]}
                >
                  <Text
                    variant="labelMedium"
                    style={[
                      styles.dayNumber,
                      {
                        color: hasStatus
                          ? '#FFFFFF'
                          : isToday || isSelected
                            ? theme.colors.primary
                            : theme.colors.onSurface,
                        fontWeight: hasStatus || isToday || isSelected ? '700' : '500',
                      },
                    ]}
                  >
                    {format(day, 'd')}
                  </Text>
                </View>
              </View>
              {isToday ? <View style={styles.todayDot} /> : <View style={styles.todayDotSpacer} />}
            </Pressable>
          );
        })}
      </View>
      <View style={styles.legendRow}>
        <LegendDot color={EduForestColors.success} label={t('attendance.statPresent')} />
        <LegendDot color={EduForestColors.danger} label={t('attendance.statAbsent')} />
        <LegendDot color={EduForestColors.warning} label={t('attendance.statLate')} />
        <LegendDot color={EduForestColors.primary} label={t('attendance.statLeave')} />
      </View>
    </View>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text variant="labelSmall" style={{ color: EduForestColors.textSecondary }}>
        {label}
      </Text>
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
  monthHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginBottom: 12,
  },
  monthTitle: {
    fontWeight: '700',
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
    paddingVertical: 2,
  },
  dayRing: {
    width: 36,
    height: 36,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayDot: {
    width: 32,
    height: 32,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  dayNumber: {
    textAlign: 'center',
  },
  todayDot: {
    width: 5,
    height: 5,
    borderRadius: 999,
    backgroundColor: EduForestColors.primary,
    marginTop: 2,
  },
  todayDotSpacer: {
    width: 5,
    height: 5,
    marginTop: 2,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 14,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: EduForestColors.border,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
  },
});
