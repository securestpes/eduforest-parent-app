import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { ParentStudent } from '../../../services/parent';
import { useAppLanguage } from '../../../common';
import { useParentTheme } from '../../../theme/useParentTheme';
import { ChildPhoto } from '../../../components/ui/ChildPhoto';

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
  const isActive = !student.status || /active/i.test(student.status);

  const classLine = useMemo(() => {
    const parts = [
      withPrefix(student.className, t('home.classWord')),
      withPrefix(student.sectionName, t('home.sectionShort')),
    ].filter(Boolean);
    if (parts.length) return parts.join(' • ');
    return student.batchNames?.filter(Boolean).join(' • ') || t('common.dash');
  }, [student, t]);

  const photoSize = compact ? 60 : 72;

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
        <ChildPhoto name={student.name} uri={student.profilePicUrl} size={photoSize} />

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
        </View>
      </View>
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
  row: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
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
});
