import React, { type ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

export function EmptyState({
  icon,
  title,
  message,
}: {
  icon: ComponentProps<typeof MaterialCommunityIcons>['name'];
  title: string;
  message: string;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.box, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]}>
      <View style={[styles.iconRing, { backgroundColor: theme.colors.primaryContainer }]}>
        <MaterialCommunityIcons name={icon} size={40} color={theme.colors.primary} />
      </View>
      <Text variant="titleMedium" style={[styles.title, { color: theme.colors.onSurface }]}>
        {title}
      </Text>
      <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', marginTop: 8 }}>
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
    borderWidth: 1,
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
