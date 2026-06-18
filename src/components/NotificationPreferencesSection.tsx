import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Switch, Text, useTheme } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useFocusEffect } from '@react-navigation/native';
import { getMyStudents, type ParentStudent } from '../services/parent';
import {
  getNotificationPreferences,
  saveNotificationPreferences,
  type NotificationPreferences,
} from '../services/notificationPreferences';
import { formatApiTime } from '../utils/localDateTime';
import type { AppTheme } from '../theme';
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
  const theme = useTheme() as AppTheme;
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
    const normalized =
      nextIds.length === allIds.length ? [] : nextIds;
    await update({ childIds: normalized });
  };

  const isChildEnabled = (studentId: number) => {
    if (!prefs) return true;
    if (prefs.childIds.length === 0) return true;
    return prefs.childIds.includes(studentId);
  };

  if (!prefs) return null;

  return (
    <>
      <Text
        variant="labelLarge"
        style={{
          color: theme.colors.onSurfaceVariant,
          fontWeight: '700',
          marginTop: 16,
          marginBottom: 8,
        }}
      >
        {t('profile.alertTypesTitle')}
      </Text>
      <View
        style={[
          styles.card,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.outlineVariant,
          },
        ]}
      >
        <PrefToggleRow
          label={t('profile.alertPresent')}
          value={prefs.alertPresent}
          onChange={(v) => void update({ alertPresent: v })}
          theme={theme}
        />
        <PrefToggleRow
          label={t('profile.alertLate')}
          value={prefs.alertLate}
          onChange={(v) => void update({ alertLate: v })}
          theme={theme}
        />
        <PrefToggleRow
          label={t('profile.alertAbsent')}
          value={prefs.alertAbsent}
          onChange={(v) => void update({ alertAbsent: v })}
          theme={theme}
          last
        />
      </View>

      <Text
        variant="labelLarge"
        style={{
          color: theme.colors.onSurfaceVariant,
          fontWeight: '700',
          marginTop: 16,
          marginBottom: 8,
        }}
      >
        {t('profile.quietHoursTitle')}
      </Text>
      <View
        style={[
          styles.card,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.outlineVariant,
          },
        ]}
      >
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text
              variant="titleSmall"
              style={{ color: theme.colors.onSurface, fontWeight: '700' }}
            >
              {t('profile.quietHoursEnable')}
            </Text>
            <Text
              variant="bodySmall"
              style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}
            >
              {t('profile.quietHoursBody')}
            </Text>
          </View>
          <Switch
            value={prefs.quietHoursEnabled}
            onValueChange={(v) => void update({ quietHoursEnabled: v })}
          />
        </View>
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
              theme={theme}
            />
            <TimeRow
              label={t('profile.quietTo')}
              value={formatPrefTime(prefs.quietEnd)}
              onPress={() =>
                void update({
                  quietEnd: cycleTime(prefs.quietEnd, QUIET_END_OPTIONS),
                })
              }
              theme={theme}
              last
            />
          </>
        ) : null}
      </View>

      {students.length > 1 ? (
        <>
          <Text
            variant="labelLarge"
            style={{
              color: theme.colors.onSurfaceVariant,
              fontWeight: '700',
              marginTop: 16,
              marginBottom: 8,
            }}
          >
            {t('profile.notifyChildrenTitle')}
          </Text>
          <View
            style={[
              styles.card,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.outlineVariant,
              },
            ]}
          >
            {students.map((student, index) => (
              <PrefToggleRow
                key={student.id}
                label={student.name}
                value={isChildEnabled(student.id)}
                onChange={() => void toggleChild(student.id)}
                theme={theme}
                last={index === students.length - 1}
              />
            ))}
          </View>
        </>
      ) : null}
    </>
  );
}

function PrefToggleRow({
  label,
  value,
  onChange,
  theme,
  last,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  theme: AppTheme;
  last?: boolean;
}) {
  return (
    <View
      style={[
        styles.row,
        !last && {
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.outlineVariant,
        },
      ]}
    >
      <Text
        variant="bodyLarge"
        style={{ color: theme.colors.onSurface, flex: 1, fontWeight: '600' }}
      >
        {label}
      </Text>
      <Switch value={value} onValueChange={onChange} />
    </View>
  );
}

function TimeRow({
  label,
  value,
  onPress,
  theme,
  last,
}: {
  label: string;
  value: string;
  onPress: () => void;
  theme: AppTheme;
  last?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.row,
        !last && {
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.outlineVariant,
        },
      ]}
    >
      <Text variant="bodyLarge" style={{ color: theme.colors.onSurface, flex: 1 }}>
        {label}
      </Text>
      <Text
        variant="bodyLarge"
        style={{ color: theme.colors.primary, fontWeight: '700', marginRight: 4 }}
      >
        {value}
      </Text>
      <MaterialCommunityIcons
        name="chevron-right"
        size={20}
        color={theme.colors.outline}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
});
