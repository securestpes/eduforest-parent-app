import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useAppColors } from '../theme/appTheme';

/** App body wash used by Attendance, Fees, Profile, and stack screens. */
export function ScreenDecor({ children }: { children: React.ReactNode }) {
  const colors = useAppColors();
  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View
        pointerEvents="none"
        style={[styles.orb, styles.orbTop, { backgroundColor: colors.primarySoft, opacity: 0.7 }]}
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
    width: 220,
    height: 220,
    borderRadius: 110,
  },
  orbTop: {
    top: -140,
    right: -80,
  },
});
