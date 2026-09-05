import React from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { colors, shadows, spacing } from '../../theme/appTheme';

export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: spacing.base,
    ...shadows.card,
  },
});
