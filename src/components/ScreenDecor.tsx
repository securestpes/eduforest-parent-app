import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from 'react-native-paper';

/**
 * Soft mint background with decorative shapes for depth (no extra native deps).
 */
export function ScreenDecor({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <View
        pointerEvents="none"
        style={[
          styles.orb,
          styles.orbTop,
          { backgroundColor: theme.colors.primaryContainer, opacity: 0.65 },
        ]}
      />
      <View
        pointerEvents="none"
        style={[
          styles.orb,
          styles.orbBottom,
          { backgroundColor: theme.colors.secondaryContainer, opacity: 0.4 },
        ]}
      />
      <View style={styles.foreground}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  foreground: { flex: 1 },
  orb: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
  },
  orbTop: { top: -120, right: -80 },
  orbBottom: { bottom: -100, left: -100 },
});
