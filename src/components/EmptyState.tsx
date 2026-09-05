import React, { type ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { colors, shadows } from '../theme/appTheme';

export function EmptyState({
  icon,
  title,
  message,
}: {
  icon: ComponentProps<typeof MaterialCommunityIcons>['name'];
  title: string;
  message: string;
}) {
  return (
    <View
      style={[
        styles.box,
        shadows.card,
        { backgroundColor: colors.surface },
      ]}
    >
      <View
        style={[styles.iconRing, { backgroundColor: colors.primarySoft }]}
      >
        <MaterialCommunityIcons
          name={icon}
          size={40}
          color={colors.primary}
        />
      </View>
      <Text
        variant="titleMedium"
        style={[styles.title, { color: colors.text }]}
      >
        {title}
      </Text>
      <Text
        variant="bodyMedium"
        style={{
          color: colors.textSecondary,
          textAlign: 'center',
          marginTop: 8,
        }}
      >
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    marginTop: 8,
    paddingVertical: 28,
    paddingHorizontal: 20,
    borderRadius: 20,
    alignItems: 'center',
  },
  iconRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: { fontWeight: '700', textAlign: 'center' },
});
