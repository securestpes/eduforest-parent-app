import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useFocusEffect } from '@react-navigation/native';
import { getMyStudents, type ParentStudent } from '../services/parent';
import {
  getNotificationPreferences,
  saveNotificationPreferences,
  type NotificationPreferences,
} from '../services/notificationPreferences';
import { formatApiTime } from '../utils/localDateTime';
import { toTitleCase } from '../utils/toTitleCase';
import { radius, spacing, useAppColors, type AppColors } from '../theme/appTheme';
import { useAppLanguage } from '../common';

const QUIET_START_OPTIONS = ['21:00', '22:00', '23:00'];
const QUIET_END_OPTIONS = ['06:00', '07:00', '08:00'];

function cycleTime(current: string, options: string[]): string {
  const idx = options.indexOf(current);
  return options[(idx + 1) % options.length];
}

function formatPrefTime(hhmm: string): string {
  return formatApiTime(hhmm) || hhmm;
}

export function NotificationPreferencesSection() {
  const colors = useAppColors();
  const { t } = useAppLanguage();
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
  const [students, setStudents] = useState<ParentStudent[]>([]);

  const load = useCallback(async () => {
    const [p, st] = await Promise.all([
      getNotificationPreferences(),
      getMyStudents(),
    ]);
    setPrefs(p);
    if (st.status && Array.isArray(st.data)) setStudents(st.data);
    else setStudents([]);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const update = async (patch: Partial<NotificationPreferences>) => {
    const next = await saveNotificationPreferences(patch);
    setPrefs(next);
  };

  const toggleChild = async (studentId: number) => {
    if (!prefs) return;
    const allIds = students.map((s) => s.id);
    const current =
      prefs.childIds.length === 0 ? [...allIds] : [...prefs.childIds];
    const has = current.includes(studentId);
    let nextIds = has
      ? current.filter((id) => id !== studentId)
      : [...current, studentId];
    if (nextIds.length === 0) nextIds = [...allIds];
    const normalized = nextIds.length === allIds.length ? [] : nextIds;
    await update({ childIds: normalized });
  };

  const isChildEnabled = (studentId: number) => {
    if (!prefs) return true;
    if (prefs.childIds.length === 0) return true;
    return prefs.childIds.includes(studentId);
  };

  if (!prefs) return null;

  return (
    <View>
      <View style={[styles.divider, { backgroundColor: colors.divider }]} />
      <Text style={[styles.groupLabel, { color: colors.textTertiary }]}>
        {t('profile.alertTypesTitle')}
      </Text>
      <PrefToggleRow
        label={t('profile.alertPresent')}
        value={prefs.alertPresent}
        onChange={(v) => void update({ alertPresent: v })}
        colors={colors}
      />
      <PrefToggleRow
        label={t('profile.alertLate')}
        value={prefs.alertLate}
        onChange={(v) => void update({ alertLate: v })}
        colors={colors}
      />
      <PrefToggleRow
        label={t('profile.alertAbsent')}
        value={prefs.alertAbsent}
        onChange={(v) => void update({ alertAbsent: v })}
        colors={colors}
        last={!prefs.quietHoursEnabled && students.length <= 1}
      />

      <View style={[styles.divider, { backgroundColor: colors.divider }]} />
      <PrefToggleRow
        label={t('profile.quietHoursEnable')}
        subtitle={t('profile.quietHoursBody')}
        value={prefs.quietHoursEnabled}
        onChange={(v) => void update({ quietHoursEnabled: v })}
        colors={colors}
        last={!prefs.quietHoursEnabled && students.length <= 1}
      />
      {prefs.quietHoursEnabled ? (
        <>
          <TimeRow
            label={t('profile.quietFrom')}
            value={formatPrefTime(prefs.quietStart)}
            onPress={() =>
              void update({
                quietStart: cycleTime(prefs.quietStart, QUIET_START_OPTIONS),
              })
            }
            colors={colors}
          />
          <TimeRow
            label={t('profile.quietTo')}
            value={formatPrefTime(prefs.quietEnd)}
            onPress={() =>
              void update({
                quietEnd: cycleTime(prefs.quietEnd, QUIET_END_OPTIONS),
              })
            }
            colors={colors}
            last={students.length <= 1}
          />
        </>
      ) : null}

      {students.length > 1 ? (
        <>
          <View style={[styles.divider, { backgroundColor: colors.divider }]} />
          <Text style={[styles.groupLabel, { color: colors.textTertiary }]}>
            {t('profile.notifyChildrenTitle')}
          </Text>
          {students.map((student, index) => (
            <PrefToggleRow
              key={student.id}
              label={toTitleCase(student.name) || student.name}
              value={isChildEnabled(student.id)}
              onChange={() => void toggleChild(student.id)}
              colors={colors}
              last={index === students.length - 1}
            />
          ))}
        </>
      ) : null}
    </View>
  );
}

function PrefToggleRow({
  label,
  subtitle,
  value,
  onChange,
  colors,
  last,
}: {
  label: string;
  subtitle?: string;
  value: boolean;
  onChange: (v: boolean) => void;
  colors: AppColors;
  last?: boolean;
}) {
  return (
    <View
      style={[
        styles.row,
        !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.divider },
      ]}
    >
      <View style={{ flex: 1, paddingRight: 8 }}>
        <Text style={[styles.rowTitle, { color: colors.text }]}>{label}</Text>
        {subtitle ? (
          <Text style={[styles.rowSub, { color: colors.textSecondary }]}>{subtitle}</Text>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: colors.border, true: colors.primaryMuted }}
        thumbColor={value ? colors.primary : colors.surface}
        ios_backgroundColor={colors.border}
      />
    </View>
  );
}

function TimeRow({
  label,
  value,
  onPress,
  colors,
  last,
}: {
  label: string;
  value: string;
  onPress: () => void;
  colors: AppColors;
  last?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.row,
        !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.divider },
      ]}
    >
      <Text style={[styles.rowTitle, { color: colors.text, flex: 1 }]}>{label}</Text>
      <Text style={[styles.timeValue, { color: colors.primary }]}>{value}</Text>
      <MaterialCommunityIcons name="chevron-right" size={18} color={colors.textTertiary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: spacing.base,
  },
  groupLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    paddingHorizontal: spacing.base,
    paddingTop: 12,
    paddingBottom: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: 13,
    gap: 8,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  rowSub: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
  },
  timeValue: {
    fontSize: 14,
    fontWeight: '700',
  },
});
