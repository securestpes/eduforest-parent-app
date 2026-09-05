import React from 'react';
import { StyleSheet, View } from 'react-native';
import { EduForestColors } from '../theme/eduForestTokens';

/** App body wash used by Attendance, Fees, Profile, and stack screens. */
export function ScreenDecor({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.root}>
      <View pointerEvents="none" style={[styles.orb, styles.orbTop]} />
      <View style={styles.foreground}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: EduForestColors.background },
  foreground: { flex: 1 },
  orb: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
  },
  orbTop: {
    top: -140,
    right: -80,
    backgroundColor: EduForestColors.primaryLight,
    opacity: 0.7,
  },
});
