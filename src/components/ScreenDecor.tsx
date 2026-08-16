import React from 'react';
import { StyleSheet, View } from 'react-native';
import { EduForestColors } from '../theme/eduForestTokens';

/**
 * Soft EduForest background (aligned with gentrack school home).
 */
export function ScreenDecor({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.root}>
      <View pointerEvents="none" style={[styles.orb, styles.orbTop]} />
      <View pointerEvents="none" style={[styles.orb, styles.orbBottom]} />
      <View style={styles.foreground}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: EduForestColors.background },
  foreground: { flex: 1 },
  orb: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
  },
  orbTop: {
    top: -240,
    right: -75,
    backgroundColor: EduForestColors.primaryLight,
    opacity: 0.55,
  },
  orbBottom: {
    bottom: -100,
    left: -100,
    backgroundColor: EduForestColors.secondaryLight,
    opacity: 0.4,
  },
});
