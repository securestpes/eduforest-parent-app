import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { differenceInCalendarDays, startOfDay } from 'date-fns';
import type { ParentHomeworkItem } from '../../../services/parent';
import { shadows, useAppColors, type AppColors } from '../../../theme/appTheme';
import { useAppLanguage } from '../../../common';
import {
  parseHomeworkDate,
  subjectVisual,
  type HomeworkUiStatus,
} from '../utils/homeworkStatus';

function dueTone(
  dueDate: string | null | undefined,
  status: HomeworkUiStatus,
  today: Date,
  colors: AppColors
): { labelKey: 'homework.overdue' | 'homework.dueToday' | 'homework.dueTomorrow' | 'homework.dueInDays' | 'homework.noDue' | 'homework.doneBadge'; count?: number; bg: string; fg: string } {
  if (status === 'submitted') {
    return { labelKey: 'homework.doneBadge', bg: colors.successSoft, fg: colors.success };
  }
  if (status === 'overdue') {
    return { labelKey: 'homework.overdue', bg: colors.dangerSoft, fg: colors.danger };
  }
  const due = parseHomeworkDate(dueDate);
  if (!due) {
    return { labelKey: 'homework.noDue', bg: colors.divider, fg: colors.textSecondary };
  }
  const days = differenceInCalendarDays(startOfDay(due), startOfDay(today));
  if (days <= 0) {
    return { labelKey: 'homework.dueToday', bg: colors.dangerSoft, fg: colors.danger };
  }
  if (days === 1) {
    return { labelKey: 'homework.dueTomorrow', bg: colors.warningSoft, fg: colors.warning };
  }
  if (days <= 3) {
    return { labelKey: 'homework.dueInDays', count: days, bg: colors.warningSoft, fg: colors.warning };
  }
  return { labelKey: 'homework.dueInDays', count: days, bg: colors.primarySoft, fg: colors.primary };
}

export function HomeworkTaskCard({
  item,
  status,
  onPress,
  onToggleDone,
  toggling,
}: {
  item: ParentHomeworkItem;
  status: HomeworkUiStatus;
  onPress: () => void;
  onToggleDone?: () => void;
  toggling?: boolean;
}) {
  const { t } = useAppLanguage();
  const colors = useAppColors();
  const styles = createTaskStyles(colors);
  const visual = subjectVisual(item.subjectName);
  const tone = dueTone(item.dueDate, status, new Date(), colors);
  const badgeLabel =
    tone.labelKey === 'homework.dueInDays'
      ? t(tone.labelKey, { count: tone.count ?? 0 })
      : t(tone.labelKey);
  const done = status === 'submitted';

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={item.title}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.92 }]}
    >
      <View style={[styles.icon, { backgroundColor: visual.bg }]}>
        <MaterialCommunityIcons name={visual.icon} size={22} color={visual.tint} />
      </View>
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={2}>
            {item.title}
          </Text>
          <View style={[styles.badge, { backgroundColor: tone.bg }]}>
            <Text style={[styles.badgeText, { color: tone.fg }]} numberOfLines={1}>
              {badgeLabel}
            </Text>
          </View>
        </View>
        {item.assignedBy ? (
          <Text style={styles.teacher} numberOfLines={1}>
            {item.assignedBy}
          </Text>
        ) : item.subjectName ? (
          <Text style={styles.teacher} numberOfLines={1}>
            {item.subjectName}
          </Text>
        ) : null}
        <View style={styles.footer}>
          {item.hasAttachments ? (
            <View style={styles.meta}>
              <MaterialCommunityIcons name="paperclip" size={14} color={colors.textTertiary} />
              <Text style={styles.metaText}>{t('homework.attachment')}</Text>
            </View>
          ) : (
            <View />
          )}
          {onToggleDone ? (
            <Pressable
              onPress={onToggleDone}
              disabled={toggling}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={done ? t('homework.undoDone') : t('homework.markDone')}
              style={styles.actionBtn}
            >
              {toggling ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Text style={[styles.action, done && styles.actionMuted]}>
                  {done ? t('homework.undoDone') : t('homework.markDone')}
                </Text>
              )}
            </Pressable>
          ) : (
            <Text style={styles.action}>{t('homework.viewDetails')}</Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}

function createTaskStyles(colors: AppColors) {
  return StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 14,
    ...shadows.card,
  },
  icon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, minWidth: 0 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  title: {
    flex: 1,
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  badge: {
    maxWidth: 118,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  teacher: {
    marginTop: 4,
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '500',
  },
  footer: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { color: colors.textTertiary, fontSize: 12, fontWeight: '500' },
  action: { color: colors.primary, fontSize: 13, fontWeight: '700' },
  actionMuted: { color: colors.textSecondary },
  actionBtn: { minWidth: 72, alignItems: 'flex-end', justifyContent: 'center', minHeight: 20 },
  });
}
