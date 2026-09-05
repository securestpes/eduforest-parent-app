import React from 'react';
import { StyleSheet, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

export function SchoolHeroArt() {
  return (
    <View style={styles.wrap} pointerEvents="none">
      <View style={styles.hill} />
      <View style={[styles.tree, { left: 6 }]} />
      <View style={[styles.tree, { right: 8, height: 22, width: 14 }]} />
      <View style={styles.building}>
        <View style={styles.roof} />
        <View style={styles.clock}>
          <MaterialCommunityIcons name="clock-outline" size={10} color="#F8FAFC" />
        </View>
        <View style={styles.flagPole} />
        <View style={styles.flag} />
        <View style={styles.windowRow}>
          <View style={styles.window} />
          <View style={styles.window} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: 88, height: 78 },
  hill: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 22,
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    backgroundColor: 'rgba(74, 222, 128, 0.35)',
  },
  tree: {
    position: 'absolute',
    bottom: 14,
    width: 16,
    height: 26,
    borderRadius: 10,
    backgroundColor: 'rgba(34, 197, 94, 0.85)',
  },
  building: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    width: 48,
    height: 42,
    borderRadius: 6,
    backgroundColor: '#FBBF24',
  },
  roof: {
    position: 'absolute',
    top: -10,
    left: -4,
    right: -4,
    height: 16,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    backgroundColor: '#F59E0B',
  },
  clock: {
    position: 'absolute',
    top: 6,
    alignSelf: 'center',
    left: 16,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#92400E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  flagPole: {
    position: 'absolute',
    top: -22,
    right: 6,
    width: 2,
    height: 16,
    backgroundColor: '#FFFFFF',
  },
  flag: {
    position: 'absolute',
    top: -22,
    right: -8,
    width: 12,
    height: 8,
    backgroundColor: '#FB7185',
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
  },
  windowRow: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  window: {
    width: 10,
    height: 10,
    borderRadius: 2,
    backgroundColor: '#1D4ED8',
  },
});
