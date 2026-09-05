import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { colors, spacing, typography } from '../../../theme/appTheme';
import { Card } from '../../../components/ui/Card';

export function OverviewCards({
  pending,
  submitted,
  overdue,
}: {
  pending: number;
  submitted: number;
  overdue: number;
}) {
  const items = [
    {
      label: `${pending} Pending`,
      hint: 'Needs to be done',
      icon: 'clipboard-text-outline' as const,
      color: colors.primary,
      bg: colors.primarySoft,
    },
    {
      label: `${submitted} Submitted`,
      hint: 'Well done!',
      icon: 'check-circle-outline' as const,
      color: colors.success,
      bg: colors.successSoft,
    },
    {
      label: `${overdue} Overdue`,
      hint: 'Past due date',
      icon: 'alarm' as const,
      color: colors.danger,
      bg: colors.dangerSoft,
    },
  ];

  return (
    <View style={styles.row}>
      {items.map((item) => (
        <Card key={item.label} style={styles.card}>
          <View style={[styles.icon, { backgroundColor: item.bg }]}>
            <MaterialCommunityIcons name={item.icon} size={18} color={item.color} />
          </View>
          <Text style={[typography.cardTitle, { color: colors.text, marginTop: 10 }]} numberOfLines={2}>
            {item.label}
          </Text>
          <Text style={[typography.meta, { color: colors.textTertiary, marginTop: 2 }]}>{item.hint}</Text>
        </Card>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm },
  card: { flex: 1, padding: spacing.md },
  icon: {
    width: 32,
    height: 32,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
