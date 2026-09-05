import React from "react";
import { Animated, Dimensions, Image, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useParentTheme } from "../../../theme/useParentTheme";

export const HOME_HERO_BG = require("../../../assets/home-hero-bg.png");
export const HERO_ASPECT = 1024 / 512;

export function homeHeroHeight(width = Dimensions.get("window").width) {
  return width / HERO_ASPECT;
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
  const height = homeHeroHeight(width);

  return (
    <View style={[styles.wrap, { width, height }]}>
      <Image source={HOME_HERO_BG} style={styles.image} resizeMode="stretch" />
      <View
        style={[
          styles.overlay,
          { paddingTop: insets.top, paddingHorizontal: spacing.lg },
        ]}
        pointerEvents="none"
      >
        <View style={styles.topSpacer} />
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
  topSpacer: {
    height: 64,
  },
  greetRow: {
    marginTop: 8,
    paddingRight: "36%",
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
