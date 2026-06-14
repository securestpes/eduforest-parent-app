import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppLanguage } from '../contexts';

export const OfflineBanner: React.FC<{ visible?: boolean }> = ({ visible = false }) => {
  const insets = useSafeAreaInsets();
  const { t } = useAppLanguage();
  if (!visible) return null;

  return (
    <View style={[styles.wrap, { paddingTop: insets.top }]}>
      <View style={styles.bar}>
        <Text style={styles.text}>{t('common.offlineBanner')}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { backgroundColor: '#78350F' },
  bar: { paddingVertical: 10, paddingHorizontal: 14 },
  text: { color: '#FFFBEB', fontSize: 13, fontWeight: '600' },
});
