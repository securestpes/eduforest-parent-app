import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useParentTheme } from '../../../theme/useParentTheme';
import { subjectVisual } from '../../homework/utils/homeworkStatus';

export type HomeScheduleItem = {
  id: string;
  title: string;
  timeLabel: string;
  meta: string;
  tone: 'attendance' | 'fees' | 'exams';
};

type Props = {
  items: HomeScheduleItem[];
  emptyLabel: string;
  onOpen: () => void;
};

const TONE_DOT: Record<HomeScheduleItem['tone'], string> = {
  attendance: '#22C55E',
  fees: '#F59E0B',
  exams: '#3B82F6',
};

export function ScheduleList({ items, emptyLabel, onOpen }: Props) {
  const { colors, spacing, typography, shadows } = useParentTheme();

  if (!items.length) {
    return (
      <View
        style={[
          styles.empty,
          shadows.card,
          {
            backgroundColor: colors.surface,
            borderRadius: 20,
          },
        ]}
      >
        <Text style={[typography.body, { color: colors.textSecondary }]}>{emptyLabel}</Text>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.card,
        shadows.card,
        { backgroundColor: colors.surface, paddingHorizontal: spacing.base },
      ]}
    >
      {items.map((item, index) => {
        const visual = subjectVisual(item.title);
        const last = index === items.length - 1;
        return (
          <Pressable key={item.id} onPress={onOpen} style={styles.row}>
            <View style={styles.timeCol}>
              <Text style={[typography.time, { color: colors.textSecondary }]}>{item.timeLabel}</Text>
            </View>
            <View style={styles.rail}>
              <View style={[styles.dot, { backgroundColor: TONE_DOT[item.tone] }]} />
              {!last ? <View style={[styles.line, { backgroundColor: colors.timeline }]} /> : null}
            </View>
            <View style={[styles.icon, { backgroundColor: visual.bg }]}>
              <MaterialCommunityIcons name={visual.icon} size={18} color={visual.tint} />
            </View>
            <View style={{ flex: 1, minWidth: 0, paddingVertical: 12 }}>
              <Text style={[typography.cardTitle, { color: colors.text }]} numberOfLines={1}>
                {item.title}
              </Text>
              <Text style={[typography.meta, { color: colors.textSecondary, marginTop: 2 }]} numberOfLines={1}>
                {item.meta}
              </Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textTertiary} />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 20 },
  empty: { padding: 20, alignItems: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  timeCol: { width: 108 },
  rail: { width: 14, alignItems: 'center', alignSelf: 'stretch', paddingTop: 18 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  line: { width: 2, flex: 1, marginTop: 4 },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
