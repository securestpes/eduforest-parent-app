import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Text, useTheme } from "react-native-paper";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useUnreadNotificationCount } from "../common/hooks/useUnreadNotificationCount";
import type { AppTheme } from "../theme";
import { useAppLanguage } from "../common";
import { colors } from "../theme/appTheme";

type Props = {
  onPress: () => void;
  iconColor?: string;
  variant?: "plain" | "well";
};

export function NotificationBellButton({
  onPress,
  iconColor,
  variant = "plain",
}: Props) {
  const theme = useTheme() as AppTheme;
  const { t } = useAppLanguage();
  const unreadCount = useUnreadNotificationCount();
  const well = variant === "well";
  const color = well
    ? colors.headerOn
    : (iconColor ?? theme.colors.onBackground);
  const badgeLabel =
    unreadCount > 99 ? "99+" : unreadCount > 0 ? String(unreadCount) : null;

  return (
    <Pressable
      hitSlop={12}
      onPress={onPress}
      style={[styles.wrap, well && styles.well]}
      accessibilityRole="button"
      accessibilityLabel={
        unreadCount > 0
          ? t("notifications.bellWithUnread", { count: unreadCount })
          : t("nav.alerts")
      }
    >
      <MaterialCommunityIcons
        name={well || unreadCount > 0 ? "bell" : "bell-outline"}
        size={well ? 22 : 24}
        color={color}
      />
      {badgeLabel ? (
        <View
          style={[
            styles.badge,
            well && styles.badgeOnWell,
            {
              backgroundColor: theme.colors.error,
              borderColor: well
                ? "rgba(255,255,255,0.9)"
                : theme.colors.surface,
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
    position: "relative",
  },
  well: {
    width: 40,
    height: 40,
    borderRadius: 20,
    padding: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.overlay,
  },
  badge: {
    position: "absolute",
    top: 2,
    right: 2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
  },
  badgeOnWell: {
    top: -2,
    right: -2,
  },
  badgeText: {
    fontSize: 10,
    lineHeight: 12,
    fontWeight: "800",
  },
});
