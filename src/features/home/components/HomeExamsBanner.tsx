import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useAppLanguage } from '../../../common';
import { useParentTheme } from '../../../theme/useParentTheme';
import type { HomeExamSnapshot, HomeResultSnapshot } from '../hooks/useHomeDashboard';

type Props = {
  nextExam: HomeExamSnapshot | null;
  latestResult: HomeResultSnapshot | null;
  hasAnyExams: boolean;
  onOpenUpcoming: () => void;
  onOpenResults: () => void;
};

export function HomeExamsBanner({
  nextExam,
  latestResult,
  hasAnyExams,
  onOpenUpcoming,
  onOpenResults,
}: Props) {
  const { t } = useAppLanguage();
  const { colors } = useParentTheme();
  const accent = colors.modules.exams;
  const idle = !nextExam && !latestResult;

  const resultMetric = latestResult
    ? latestResult.partial
      ? t('exams.pendingMarks')
      : latestResult.percent != null
        ? `${Math.round(latestResult.percent)}%`
        : t('home.noResultsYet')
    : t('home.noResultsYet');

  if (idle) {
    return (
      <Pressable
        onPress={onOpenUpcoming}
        style={[styles.card, styles.idleCard, { backgroundColor: accent.card }]}
        accessibilityRole="button"
        accessibilityLabel={t('home.examsResults')}
      >
        <View style={[styles.iconWell, { backgroundColor: accent.well }]}>
          <MaterialCommunityIcons
            name="file-document-outline"
            size={20}
            color={accent.icon}
          />
        </View>
        <View style={styles.copy}>
          <Text style={[styles.label, { color: colors.text }]} numberOfLines={1}>
            {t('home.examsResults')}
          </Text>
          <Text style={[styles.idleSub, { color: accent.metric }]} numberOfLines={2}>
            {hasAnyExams ? t('home.examsAwaitingPublish') : t('home.examsNothingYet')}
          </Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={20} color={accent.icon} />
      </Pressable>
    );
  }

  return (
    <View style={[styles.card, { backgroundColor: accent.card }]}>
      <Text style={[styles.heading, { color: colors.text }]}>
        {t('home.examsResults')}
      </Text>
      <Pressable
        onPress={onOpenUpcoming}
        style={styles.row}
        accessibilityRole="button"
        accessibilityLabel={t('home.nextExamLabel')}
      >
        <View style={[styles.iconWell, { backgroundColor: accent.well }]}>
          <MaterialCommunityIcons
            name="calendar-blank-outline"
            size={20}
            color={accent.icon}
          />
        </View>
        <View style={styles.copy}>
          <Text style={[styles.label, { color: colors.text }]} numberOfLines={1}>
            {t('home.nextExamLabel')}
          </Text>
          <Text style={[styles.metric, { color: accent.metric }]} numberOfLines={1}>
            {nextExam
              ? [nextExam.dateLabel, nextExam.name].filter(Boolean).join(' · ')
              : t('home.noUpcomingExams')}
          </Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={20} color={accent.icon} />
      </Pressable>
      <View style={[styles.divider, { backgroundColor: accent.well }]} />
      <Pressable
        onPress={onOpenResults}
        style={styles.row}
        accessibilityRole="button"
        accessibilityLabel={t('exams.tabResults')}
      >
        <View style={[styles.iconWell, { backgroundColor: accent.well }]}>
          <MaterialCommunityIcons
            name="file-document-outline"
            size={20}
            color={accent.icon}
          />
        </View>
        <View style={styles.copy}>
          <Text style={[styles.label, { color: colors.text }]} numberOfLines={1}>
            {latestResult ? t('home.latestResult') : t('exams.tabResults')}
          </Text>
          <Text style={[styles.metric, { color: accent.metric }]} numberOfLines={1}>
            {latestResult ? `${latestResult.name} · ${resultMetric}` : resultMetric}
          </Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={20} color={accent.icon} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 6,
  },
  idleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingBottom: 14,
  },
  heading: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: -0.1,
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 10,
  },
  iconWell: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  copy: { flex: 1, minWidth: 0 },
  label: { fontSize: 12, fontWeight: '700' },
  metric: { fontSize: 14, fontWeight: '700', marginTop: 2 },
  idleSub: { fontSize: 13, fontWeight: '600', marginTop: 2, lineHeight: 18 },
  divider: { height: 1, marginLeft: 46, opacity: 0.9 },
});
