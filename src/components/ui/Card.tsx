import React from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { shadows, spacing, useAppColors } from '../../theme/appTheme';

export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  const colors = useAppColors();
  return <View style={[styles.card, { backgroundColor: colors.surface }, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: spacing.base,
    ...shadows.card,
  },
});
