import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { ParentStudent } from '../../services/parent';
import { useAppLanguage } from '../../common';
import { colors, shadows, spacing } from '../../theme/appTheme';
import { StudentModuleHero } from './StudentModuleHero';

type Stats = {
  pctPresent: number;
  present: number;
  absent: number;
  late: number;
  leave: number;
};

type Props = {
  student: ParentStudent | null;
  stats: Stats;
  onBack: () => void;
};

export function AttendanceHeroHeader({ student, stats, onBack }: Props) {
  const { t } = useAppLanguage();

  return (
    <StudentModuleHero
      title={t('nav.attendance')}
      student={student}
      onBack={onBack}
      backAccessibilityLabel={t('attendance.backHome')}
    >
      <View style={styles.statsCard}>
        <View style={styles.pctRow}>
          <Text style={[styles.statValue, { color: colors.success }]}>
            {`${stats.pctPresent}%`}
          </Text>
          <Text style={[styles.pctLabel, { color: colors.success }]}>
            {t('attendance.statThisMonth')}
          </Text>
        </View>
        <View style={styles.statusRow}>
          <View style={styles.statCell}>
            <Text style={[styles.statValue, { color: colors.success }]} numberOfLines={1}>
              {String(stats.present)}
            </Text>
            <Text style={[styles.statLabel, { color: colors.success }]} numberOfLines={1}>
              {t('attendance.statPresent')}
            </Text>
          </View>
          <View style={styles.statCell}>
            <Text style={[styles.statValue, { color: colors.danger }]} numberOfLines={1}>
              {String(stats.absent)}
            </Text>
            <Text style={[styles.statLabel, { color: colors.danger }]} numberOfLines={1}>
              {t('attendance.statAbsent')}
            </Text>
          </View>
          <View style={styles.statCell}>
            <Text style={[styles.statValue, { color: colors.warning }]} numberOfLines={1}>
              {String(stats.late)}
            </Text>
            <Text style={[styles.statLabel, { color: colors.warning }]} numberOfLines={1}>
              {t('attendance.statLate')}
            </Text>
          </View>
          <View style={[styles.statCell, styles.statCellLast]}>
            <Text style={[styles.statValue, { color: colors.primary }]} numberOfLines={1}>
              {String(stats.leave)}
            </Text>
            <Text style={[styles.statLabel, { color: colors.primary }]} numberOfLines={1}>
              {t('attendance.statLeave')}
            </Text>
          </View>
        </View>
      </View>
    </StudentModuleHero>
  );
}

const styles = StyleSheet.create({
  statsCard: {
    marginTop: -22,
    marginHorizontal: spacing.base,
    backgroundColor: colors.surface,
    borderRadius: 20,
    ...shadows.card,
    zIndex: 3,
    overflow: 'hidden',
  },
  pctRow: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#EEF0F3',
  },
  pctLabel: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  statCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    minWidth: 0,
    borderColor: '#EEF0F3',
    borderRightWidth: StyleSheet.hairlineWidth,
  },
  statCellLast: {
    borderRightWidth: 0,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
  },
  statLabel: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 14,
  },
});
