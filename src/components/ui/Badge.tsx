import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { radius, typography, useAppColors } from '../../theme/appTheme';

export function Badge({
  label,
  tone,
}: {
  label: string;
  tone: 'success' | 'warning' | 'danger' | 'primary';
}) {
  const colors = useAppColors();
  const map = {
    success: { fg: colors.success, bg: colors.successSoft },
    warning: { fg: '#D97706', bg: colors.warningSoft },
    danger: { fg: colors.danger, bg: colors.dangerSoft },
    primary: { fg: colors.primary, bg: colors.primarySoft },
  }[tone];
  return (
    <View style={[styles.badge, { backgroundColor: map.bg }]}>
      <Text style={[styles.text, { color: map.fg }]}>{label}</Text>
    </View>
  );
}

export function FilterChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const colors = useAppColors();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: active ? colors.primary : colors.surface,
          borderColor: active ? colors.primary : colors.border,
        },
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      <Text style={[typography.meta, { color: active ? colors.headerOn : colors.textSecondary }]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  text: { ...typography.badge },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.full,
    borderWidth: 1,
    minHeight: 36,
    justifyContent: 'center',
  },
});
