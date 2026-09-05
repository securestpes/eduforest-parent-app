import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { colors, radius, spacing, typography } from '../../../theme/appTheme';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import type { ParentHomeworkItem } from '../../../services/parent';
import {
  dueMeta,
  subjectVisual,
  type HomeworkUiStatus,
} from '../utils/homeworkStatus';

export function HomeworkListItem({
  item,
  status,
  onPress,
}: {
  item: ParentHomeworkItem;
  status: HomeworkUiStatus;
  onPress: () => void;
}) {
  const visual = subjectVisual(item.subjectName);
  const due = dueMeta(item.dueDate);
  const tone = status === 'submitted' ? 'success' : status === 'overdue' ? 'danger' : 'warning';
  const statusLabel = status === 'submitted' ? 'Submitted' : status === 'overdue' ? 'Overdue' : 'Pending';

  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={item.title}>
      <Card style={styles.card}>
        <View style={styles.row}>
          <View style={[styles.icon, { backgroundColor: visual.bg }]}>
            <MaterialCommunityIcons name={visual.icon} size={22} color={visual.tint} />
          </View>
          <View style={styles.body}>
            <Text style={[typography.cardTitle, { color: colors.text }]} numberOfLines={2}>
              {item.title}
            </Text>
            <Text style={[typography.meta, { color: colors.textSecondary, marginTop: 4 }]} numberOfLines={1}>
              {item.subjectName || 'Homework'}
              {item.hasAttachments ? '  •  Attachment' : ''}
            </Text>
            <Text style={[typography.meta, { color: colors.primary, marginTop: 6 }]}>View Details</Text>
          </View>
          <View style={styles.right}>
            <Text style={[typography.meta, { color: colors.textSecondary, textAlign: 'right' }]}>{due.line}</Text>
            {due.sub ? (
              <Text style={[typography.badge, { color: colors.textTertiary, textAlign: 'right', marginTop: 2 }]}>
                {due.sub}
              </Text>
            ) : null}
            <View style={{ marginTop: 8, alignItems: 'flex-end' }}>
              <Badge label={statusLabel} tone={tone} />
            </View>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={20} color={colors.primaryMuted} />
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { padding: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, minWidth: 0 },
  right: { maxWidth: 110 },
});
