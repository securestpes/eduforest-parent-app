import React, { useMemo } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { ParentStudent } from '../../../services/parent';
import { useAppLanguage } from '../../../common';
import { normalizeUploadUrl } from '../../../common/helpers/normalizeUploadUrl';
import { useParentTheme } from '../../../theme/useParentTheme';
import { initials, avatarHue } from '../../../utils/attendanceVisuals';

type Props = {
  student: ParentStudent;
  selected: boolean;
  width: number;
  compact?: boolean;
  onPress: () => void;
};

function withPrefix(value: string | null | undefined, word: string): string | null {
  if (!value?.trim()) return null;
  const v = value.trim();
  return new RegExp(`^${word}\\b`, 'i').test(v) ? v : `${word} ${v}`;
}

export function ChildCard({ student, selected, width, compact, onPress }: Props) {
  const { t } = useAppLanguage();
  const { colors, typography } = useParentTheme();
  const hue = avatarHue(student.name);
  const photoUri = normalizeUploadUrl(student.profilePicUrl);
  const isActive = !student.status || /active/i.test(student.status);

  const classLine = useMemo(() => {
    const parts = [
      withPrefix(student.className, t('home.classWord')),
      withPrefix(student.sectionName, t('home.sectionShort')),
    ].filter(Boolean);
    if (parts.length) return parts.join(' • ');
    return student.batchNames?.filter(Boolean).join(' • ') || t('common.dash');
  }, [student, t]);

  const rollLine = withPrefix(student.rollNumber || String(student.id), t('home.rollWord'));

  const photoSize = compact ? 44 : 56;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={[
        styles.card,
        compact && styles.cardCompact,
        {
          width,
          backgroundColor: selected ? colors.successSoft : colors.surface,
          borderColor: selected ? colors.selectedBorder : colors.border,
        },
      ]}
    >
      <View style={styles.row}>
        <View style={styles.photoWrap}>
          {photoUri ? (
            <Image
              source={{
                uri: photoUri,
                headers: { 'ngrok-skip-browser-warning': 'true' },
              }}
              style={[styles.photo, { width: photoSize, height: photoSize }]}
              resizeMode="cover"
            />
          ) : (
            <View
              style={[
                styles.photo,
                {
                  width: photoSize,
                  height: photoSize,
                  backgroundColor: `hsl(${hue} 48% 46%)`,
                },
              ]}
            >
              <Text style={[styles.initials, compact && styles.initialsCompact]}>
                {initials(student.name)}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.body}>
          <View style={styles.nameRow}>
            <Text
              style={[typography.cardTitle, styles.name, { color: colors.text }]}
              numberOfLines={2}
            >
              {student.name}
            </Text>
            {selected && isActive ? (
              <View style={[styles.pill, { backgroundColor: '#D8F5E3' }]}>
                <Text style={[styles.pillText, { color: colors.success }]}>
                  {t('home.activeBadge')}
                </Text>
              </View>
            ) : null}
          </View>

          <Text style={[styles.meta, { color: colors.text }]} numberOfLines={2}>
            {classLine}
          </Text>
          {rollLine ? (
            <Text style={[styles.meta, { color: colors.text }]} numberOfLines={2}>
              {rollLine}
            </Text>
          ) : null}
        </View>
      </View>

      {isActive ? (
        <View style={styles.status}>
          <MaterialCommunityIcons name="shield-check" size={16} color={colors.success} />
          <Text style={[styles.statusText, { color: colors.success }]} numberOfLines={1}>
            {t('home.activeStudent')}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 12,
  },
  cardCompact: {
    padding: 10,
  },
  row: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  photoWrap: { overflow: 'hidden', borderRadius: 12 },
  photo: {
    width: 56,
    height: 56,
    borderRadius: 12,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: { color: '#FFFFFF', fontWeight: '700', fontSize: 18 },
  initialsCompact: { fontSize: 15 },
  body: { flex: 1, minWidth: 0 },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 6,
  },
  name: { flexGrow: 1, flexShrink: 1, minWidth: 72 },
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  pillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  meta: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '600',
  },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
  },
  statusText: {
    flexShrink: 1,
    fontSize: 12,
    fontWeight: '700',
  },
});
