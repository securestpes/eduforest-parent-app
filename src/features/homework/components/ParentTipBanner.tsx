import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { radius, spacing, typography, useAppColors } from '../../../theme/appTheme';
import { useAppLanguage } from '../../../common';

export function ParentTipBanner() {
  const { t } = useAppLanguage();
  const colors = useAppColors();
  return (
    <View style={[styles.banner, { backgroundColor: colors.primarySoft }]}>
      <View style={[styles.trophy, { backgroundColor: colors.surface }]}>
        <MaterialCommunityIcons name="trophy" size={28} color="#EAB308" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[typography.cardTitle, { color: colors.text }]}>{t('homework.tipTitle')}</Text>
        <Text style={[typography.meta, { color: colors.textSecondary, marginTop: 2 }]}>
          {t('homework.tipBody')}
        </Text>
      </View>
      <Pressable
        style={[styles.cta, { backgroundColor: colors.primary }]}
        accessibilityRole="button"
        accessibilityLabel={t('homework.tipA11y')}
      >
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
    borderRadius: radius.lg,
    padding: spacing.base,
  },
  trophy: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cta: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
