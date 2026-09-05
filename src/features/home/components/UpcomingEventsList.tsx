import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { format } from 'date-fns';
import { useParentTheme } from '../../../theme/useParentTheme';
import { safeParseDate } from '../utils/homeMetrics';
import type { ParentCalendarEvent } from '../../../services/parent';

type Props = {
  events: ParentCalendarEvent[];
  emptyLabel: string;
  onOpen: (event?: ParentCalendarEvent) => void;
};

function visualFor(event: ParentCalendarEvent) {
  const type = (event.eventType || '').toUpperCase();
  const title = (event.title || '').toLowerCase();
  if (type === 'HOLIDAY' || title.includes('holiday')) {
    return { icon: 'palm-tree' as const, tint: '#16A34A', bg: '#DCFCE7' };
  }
  if (
    type === 'EXAM' ||
    title.includes('quiz') ||
    title.includes('exam') ||
    title.includes('competition')
  ) {
    return { icon: 'trophy-outline' as const, tint: '#EA580C', bg: '#FFEDD5' };
  }
  if (title.includes('annual') || title.includes('celebrat') || title.includes('day')) {
    return { icon: 'party-popper' as const, tint: '#16A34A', bg: '#DCFCE7' };
  }
  return { icon: 'calendar-month-outline' as const, tint: '#7C3AED', bg: '#EDE9FE' };
}

export function UpcomingEventsList({ events, emptyLabel, onOpen }: Props) {
  const { colors, shadows, typography } = useParentTheme();

  if (!events.length) {
    return (
      <View
        style={[
          styles.empty,
          shadows.card,
          { backgroundColor: colors.surface, borderColor: colors.borderSubtle },
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
        { backgroundColor: colors.surface, borderColor: colors.borderSubtle },
      ]}
    >
      {events.map((event, index) => {
        const visual = visualFor(event);
        const date = safeParseDate(event.startDate);
        return (
          <Pressable
            key={event.id}
            onPress={() => onOpen(event)}
            style={[
              styles.row,
              index < events.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.divider },
            ]}
          >
            <View style={[styles.icon, { backgroundColor: visual.bg }]}>
              <MaterialCommunityIcons name={visual.icon} size={22} color={visual.tint} />
            </View>
            <View style={styles.copy}>
              <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
                {event.title}
              </Text>
              <Text style={[styles.sub, { color: colors.textSecondary }]} numberOfLines={1}>
                {event.description?.trim() || event.eventType || ''}
              </Text>
            </View>
            <View style={styles.dateCol}>
              <Text style={[styles.day, { color: colors.text }]}>
                {date ? format(date, 'd') : '—'}
              </Text>
              <Text style={[styles.month, { color: colors.textSecondary }]}>
                {date ? format(date, 'MMM') : ''}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  empty: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 12,
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: { flex: 1, minWidth: 0 },
  title: { fontSize: 14, fontWeight: '700' },
  sub: { fontSize: 12, fontWeight: '500', marginTop: 3 },
  dateCol: { alignItems: 'center', minWidth: 36 },
  day: { fontSize: 16, fontWeight: '800' },
  month: { fontSize: 11, fontWeight: '600', marginTop: 1 },
});
