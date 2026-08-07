import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import type { AppTheme } from '../theme';
import { useAppLanguage } from '../common';

/** Web fallback — react-native-maps is native-only. */
export function BusTrackingScreen() {
  const theme = useTheme() as AppTheme;
  const navigation = useNavigation();
  const { t } = useAppLanguage();

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: theme.colors.background }]}
      edges={['top']}
    >
      <View style={styles.header}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={[
            styles.backBtn,
            { backgroundColor: theme.colors.surfaceVariant },
          ]}
          accessibilityRole="button"
        >
          <MaterialCommunityIcons
            name="arrow-left"
            size={22}
            color={theme.colors.onSurface}
          />
        </Pressable>
        <Text variant="titleMedium" style={{ fontWeight: '700' }}>
          {t('busTracking.title')}
        </Text>
        <View style={{ width: 40 }} />
      </View>
      <View style={styles.body}>
        <MaterialCommunityIcons
          name="map-marker-radius"
          size={48}
          color={theme.colors.primary}
        />
        <Text variant="titleLarge" style={{ fontWeight: '700', textAlign: 'center' }}>
          {t('busTracking.webOnlyTitle')}
        </Text>
        <Text
          variant="bodyMedium"
          style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}
        >
          {t('busTracking.webOnlySub')}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 12,
  },
});
