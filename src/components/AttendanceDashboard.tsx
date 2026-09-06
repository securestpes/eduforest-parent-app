import React, { useMemo, useState } from 'react';
import { LayoutChangeEvent, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { isSameMonth } from 'date-fns';
import type { ParentAttendanceRow } from '../services/parent';
import {
  monthDayBreakdown,
  rowsInCalendarMonth,
  weekTrendInMonth,
} from '../utils/attendanceHistory';
import { shadows, useAppColors, type AppColors } from '../theme/appTheme';
import { useAppLanguage } from '../common';
import { formatAppDate } from '../utils/appDateLocale';

type Props = {
  rows: ParentAttendanceRow[];
  focusMonth: Date;
  sessionMonths: Date[];
  onPressMonth: () => void;
  onSelectMonth: (month: Date) => void;
};

function MonthChip({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  const colors = useAppColors();
  return (
    <Pressable onPress={onPress} hitSlop={6} style={styles.monthChip}>
      <Text style={[styles.monthChipText, { color: colors.textSecondary }]}>{label}</Text>
      <MaterialCommunityIcons name="chevron-down" size={16} color={colors.textSecondary} />
    </Pressable>
  );
}

function MiniLineChart({
  points,
}: {
  points: { label: string; pct: number }[];
}) {
  const colors = useAppColors();
  const [width, setWidth] = useState(0);
  const chartH = 132;
  const yLabels = [100, 75, 50, 25, 0];

  const onLayout = (e: LayoutChangeEvent) => {
    setWidth(e.nativeEvent.layout.width);
  };

  const coords = useMemo(() => {
    if (width <= 0 || points.length === 0) return [];
    const innerW = width;
    const step = points.length > 1 ? innerW / (points.length - 1) : innerW / 2;
    return points.map((point, index) => ({
      x: points.length === 1 ? innerW / 2 : step * index,
      y: chartH - (Math.max(0, Math.min(100, point.pct)) / 100) * chartH,
      label: point.label,
    }));
  }, [points, width]);

  return (
    <View style={styles.chartWrap}>
      <View style={styles.yAxis}>
        {yLabels.map((label) => (
          <Text key={label} style={[styles.axisText, { color: colors.textTertiary }]}>
            {label}%
          </Text>
        ))}
      </View>
      <View style={styles.chartBody}>
        <View style={styles.plotFrame} onLayout={onLayout}>
          <View style={styles.grid} pointerEvents="none">
            {yLabels.map((label) => (
              <View key={label} style={[styles.gridLine, { backgroundColor: colors.divider }]} />
            ))}
          </View>
          {coords.map((from, index) => {
            const to = coords[index + 1];
            if (!to) return null;
            const dx = to.x - from.x;
            const dy = to.y - from.y;
            const len = Math.sqrt(dx * dx + dy * dy);
            const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
            return (
              <View
                key={`line-${index}`}
                style={{
                  position: 'absolute',
                  left: (from.x + to.x) / 2 - len / 2,
                  top: (from.y + to.y) / 2 - 1.5,
                  width: len,
                  height: 3,
                  borderRadius: 2,
                  backgroundColor: colors.primary,
                  transform: [{ rotate: `${angle}deg` }],
                }}
              />
            );
          })}
          {coords.map((point) => (
            <View
              key={point.label}
              style={[
                styles.dot,
                {
                  left: point.x - 5,
                  top: point.y - 5,
                  backgroundColor: colors.primary,
                  borderColor: colors.surface,
                },
              ]}
            />
          ))}
        </View>
        <View style={styles.xAxis}>
          {points.map((point) => (
            <Text key={point.label} style={[styles.axisText, { color: colors.textTertiary, flex: 1, textAlign: 'center' }]}>
              {point.label}
            </Text>
          ))}
        </View>
      </View>
    </View>
  );
}

export function AttendanceDashboard({ rows, focusMonth, sessionMonths, onPressMonth, onSelectMonth }: Props) {
  const { t, language } = useAppLanguage();
  const colors = useAppColors();
  const cardStyles = useMemo(() => createCardStyles(colors), [colors]);
  const now = new Date();
  const monthLabel = isSameMonth(focusMonth, now)
    ? t('attendance.thisMonth')
    : formatAppDate(focusMonth, 'MMM yyyy', language);

  const monthRows = useMemo(
    () => rowsInCalendarMonth(rows, focusMonth),
    [rows, focusMonth]
  );
  const overview = useMemo(() => monthDayBreakdown(monthRows), [monthRows]);
  const trend = useMemo(
    () => weekTrendInMonth(monthRows, focusMonth, language),
    [monthRows, focusMonth, language]
  );

  return (
    <View style={styles.wrap}>
      <View style={cardStyles.card}>
        <View style={styles.cardHead}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>
            {t('attendance.overviewTitle')}
          </Text>
          <MonthChip label={monthLabel} onPress={onPressMonth} />
        </View>
        <View style={styles.overviewBody}>
          <View style={styles.pctCol}>
            <Text style={[styles.pctValue, { color: colors.primary }]}>{`${overview.pctPresent}%`}</Text>
            <Text style={[styles.pctCaption, { color: colors.primary }]}>
              {t('attendance.presentPct')}
            </Text>
          </View>
          <View style={[styles.vDivider, { backgroundColor: colors.divider }]} />
          <View style={styles.statCol}>
            <View style={[styles.statRow, { borderBottomColor: colors.divider }]}>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                {t('attendance.totalDays')}
              </Text>
              <Text style={[styles.statValue, { color: colors.text }]}>{overview.totalDays}</Text>
            </View>
            <View style={[styles.statRow, { borderBottomColor: colors.divider }]}>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                {t('attendance.presentDays')}
              </Text>
              <Text style={[styles.statValue, { color: colors.success }]}>{overview.presentDays}</Text>
            </View>
            <View style={[styles.statRow, styles.statRowLast]}>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                {t('attendance.absentDays')}
              </Text>
              <Text style={[styles.statValue, { color: colors.danger }]}>{overview.absentDays}</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={cardStyles.card}>
        <View style={styles.cardHead}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>
            {t('attendance.trendTitle')}
          </Text>
          <MonthChip label={monthLabel} onPress={onPressMonth} />
        </View>
        {monthRows.length === 0 ? (
          <Text style={[styles.emptyTrend, { color: colors.textSecondary }]}>
            {t('attendance.noTrend')}
          </Text>
        ) : (
          <MiniLineChart points={trend} />
        )}
      </View>

      <View style={styles.summaryHead}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>
          {t('attendance.monthlySummary')}
        </Text>
      </View>
      <ScrollView
        horizontal
        nestedScrollEnabled
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.monthCards}
      >
        {sessionMonths.map((month) => {
          const stats = monthDayBreakdown(rowsInCalendarMonth(rows, month));
          const active =
            month.getFullYear() === focusMonth.getFullYear() &&
            month.getMonth() === focusMonth.getMonth();
          const tone = stats.pctPresent >= 90 ? colors.success : colors.danger;
          return (
            <Pressable
              key={`${month.getFullYear()}-${month.getMonth()}`}
              onPress={() => onSelectMonth(month)}
              style={[
                styles.monthCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: active ? colors.primary : colors.border,
                },
              ]}
            >
              <Text style={[styles.monthCardLabel, { color: colors.text }]}>
                {formatAppDate(month, 'MMM yyyy', language)}
              </Text>
              <Text style={[styles.monthCardPct, { color: tone }]}>{`${stats.pctPresent}%`}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

function createCardStyles(colors: AppColors) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: 18,
      padding: 16,
      marginBottom: 14,
      ...shadows.card,
    },
  });
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 8 },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  cardTitle: { fontSize: 16, fontWeight: '800' },
  monthChip: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  monthChipText: { fontSize: 13, fontWeight: '600' },
  overviewBody: { flexDirection: 'row', alignItems: 'center' },
  pctCol: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 6 },
  pctValue: { fontSize: 40, fontWeight: '800', letterSpacing: -0.8 },
  pctCaption: { marginTop: 4, fontSize: 14, fontWeight: '700' },
  vDivider: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch', marginHorizontal: 12 },
  statCol: { flex: 1.15 },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  statRowLast: { borderBottomWidth: 0, paddingBottom: 0 },
  statLabel: { fontSize: 13, fontWeight: '500' },
  statValue: { fontSize: 16, fontWeight: '800' },
  emptyTrend: { fontSize: 13, fontWeight: '500', paddingVertical: 20, textAlign: 'center' },
  chartWrap: { flexDirection: 'row', gap: 8, minHeight: 168 },
  yAxis: { width: 36, justifyContent: 'space-between', paddingBottom: 22 },
  axisText: { fontSize: 10, fontWeight: '600' },
  chartBody: { flex: 1 },
  plotFrame: { height: 132 },
  grid: { ...StyleSheet.absoluteFillObject, justifyContent: 'space-between' },
  gridLine: { height: StyleSheet.hairlineWidth, width: '100%' },
  dot: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
  },
  xAxis: { flexDirection: 'row', marginTop: 8 },
  summaryHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    marginTop: 4,
  },
  monthCards: { gap: 10, paddingBottom: 8 },
  monthCard: {
    width: 92,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  monthCardLabel: { fontSize: 12, fontWeight: '700', marginBottom: 8 },
  monthCardPct: { fontSize: 20, fontWeight: '800' },
});
