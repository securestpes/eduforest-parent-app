import React from "react";
import { Animated, Dimensions, Image, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useParentTheme } from "../../../theme/useParentTheme";
import { COMPACT_BAR_HEIGHT } from "./HomeCompactHeader";

export const HOME_HERO_BG = require("../../../assets/hero-bg.png");
export const HERO_ASPECT = 1847 / 852;
export const HOME_SHEET_OVERLAP = 16;
const GREET_BLOCK = 62;
const LOGO_GREET_GAP = 16;

export function homeHeroHeight(
  width = Dimensions.get("window").width,
  topInset = 0,
) {
  const fromImage = width / HERO_ASPECT;
  const fromContent =
    topInset +
    COMPACT_BAR_HEIGHT +
    LOGO_GREET_GAP +
    GREET_BLOCK +
    HOME_SHEET_OVERLAP +
    12;
  return Math.max(fromImage, fromContent);
}

type Props = {
  greeting: string;
  welcome: string;
  contentOpacity?: Animated.AnimatedInterpolation<number>;
};

export function HomeHero({ greeting, welcome, contentOpacity }: Props) {
  const { colors, spacing, typography } = useParentTheme();
  const insets = useSafeAreaInsets();
  const width = Dimensions.get("window").width;
  const height = homeHeroHeight(width, insets.top);

  return (
    <View style={[styles.wrap, { width, height }]}>
      <Image source={HOME_HERO_BG} style={styles.image} resizeMode="cover" />
      <View
        style={[
          styles.overlay,
          {
            paddingTop: insets.top,
            paddingHorizontal: spacing.lg,
            paddingBottom: HOME_SHEET_OVERLAP + 8,
          },
        ]}
        pointerEvents="none"
      >
        <View style={{ height: COMPACT_BAR_HEIGHT }} />
        <Animated.View
          style={[styles.greetRow, contentOpacity ? { opacity: contentOpacity } : null]}
        >
          <Text
            style={[
              typography.greeting,
              styles.greetLine,
              { color: colors.headerOn },
            ]}
          >
            {greeting}
          </Text>
          <Text
            style={[
              typography.hero,
              styles.welcomeLine,
              { color: colors.headerOn },
            ]}
            numberOfLines={2}
          >
            {welcome}
          </Text>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { overflow: "hidden" },
  image: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
    elevation: 1,
  },
  greetRow: {
    marginTop: 16,
    paddingRight: "18%",
    alignSelf: "stretch",
    alignItems: "flex-start",
  },
  greetLine: {
    letterSpacing: 0,
    includeFontPadding: false,
    textAlign: "left",
    padding: 0,
    margin: 0,
  },
  welcomeLine: {
    letterSpacing: 0,
    includeFontPadding: false,
    textAlign: "left",
    padding: 0,
    marginTop: 2,
  },
});
