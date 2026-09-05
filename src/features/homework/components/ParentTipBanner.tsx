import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { colors, radius, spacing, typography } from '../../../theme/appTheme';

export function ParentTipBanner() {
  return (
    <View style={styles.banner}>
      <View style={styles.trophy}>
        <MaterialCommunityIcons name="trophy" size={28} color="#EAB308" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[typography.cardTitle, { color: colors.text }]}>Tip for Parents</Text>
        <Text style={[typography.meta, { color: colors.textSecondary, marginTop: 2 }]}>
          A short check-in on pending work helps more than a long reminder later.
        </Text>
      </View>
      <Pressable style={styles.cta} accessibilityRole="button" accessibilityLabel="Parent tip">
        <MaterialCommunityIcons name="chevron-right" size={22} color={colors.headerOn} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.lg,
    padding: spacing.base,
  },
  trophy: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cta: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
