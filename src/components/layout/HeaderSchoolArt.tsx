import React from 'react';
import { StyleSheet, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

/** Decorative books + pencil cup used in the child header. */
export function HeaderSchoolArt() {
  return (
    <View style={styles.wrap} pointerEvents="none">
      <MaterialCommunityIcons name="star-four-points" size={10} color="rgba(255,255,255,0.55)" style={styles.s1} />
      <MaterialCommunityIcons name="star-four-points" size={8} color="rgba(255,255,255,0.4)" style={styles.s2} />
      <View style={styles.cup}>
        <View style={[styles.pencil, { backgroundColor: '#FBBF24', left: 6 }]} />
        <View style={[styles.pencil, { backgroundColor: '#60A5FA', left: 12, height: 18 }]} />
        <View style={[styles.pencil, { backgroundColor: '#F472B6', left: 18 }]} />
      </View>
      <View style={[styles.book, { backgroundColor: '#FDE047', bottom: 18, right: 10, transform: [{ rotate: '-8deg' }] }]} />
      <View style={[styles.book, { backgroundColor: '#F9A8D4', bottom: 10, right: 8, transform: [{ rotate: '4deg' }] }]} />
      <View style={[styles.book, { backgroundColor: '#7DD3FC', bottom: 2, right: 6 }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: 72, height: 64 },
  s1: { position: 'absolute', top: 0, right: 8 },
  s2: { position: 'absolute', top: 10, right: 28 },
  cup: {
    position: 'absolute',
    right: 0,
    bottom: 8,
    width: 28,
    height: 22,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    backgroundColor: '#38BDF8',
  },
  pencil: {
    position: 'absolute',
    top: -12,
    width: 5,
    height: 16,
    borderRadius: 2,
  },
  book: {
    position: 'absolute',
    width: 34,
    height: 10,
    borderRadius: 3,
  },
});
