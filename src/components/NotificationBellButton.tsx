import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useUnreadNotificationCount } from '../common/hooks/useUnreadNotificationCount';
import type { AppTheme } from '../theme';
import { useAppLanguage } from '../common';

type Props = {
  onPress: () => void;
  iconColor?: string;
};

export function NotificationBellButton({ onPress, iconColor }: Props) {
  const theme = useTheme() as AppTheme;
  const { t } = useAppLanguage();
  const unreadCount = useUnreadNotificationCount();
  const color = iconColor ?? theme.colors.onBackground;
  const badgeLabel =
    unreadCount > 99 ? '99+' : unreadCount > 0 ? String(unreadCount) : null;

  return (
    <Pressable
      hitSlop={12}
      onPress={onPress}
      style={styles.wrap}
      accessibilityRole="button"
      accessibilityLabel={
        unreadCount > 0
          ? t('notifications.bellWithUnread', { count: unreadCount })
          : t('nav.alerts')
      }
    >
      <MaterialCommunityIcons name="bell-outline" size={24} color={color} />
      {badgeLabel ? (
        <View
          style={[
            styles.badge,
            {
              backgroundColor: theme.colors.error,
              borderColor: theme.colors.surface,
            },
          ]}
        >
          <Text
            variant="labelSmall"
            style={[styles.badgeText, { color: theme.colors.onError }]}
          >
            {badgeLabel}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    padding: 6,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  badgeText: {
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '800',
  },
});
