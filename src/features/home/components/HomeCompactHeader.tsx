import React, { useEffect, useState } from "react";
import { Animated, Image, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useParentTheme } from "../../../theme/useParentTheme";
import { TabHeaderActions } from "../../../components/TabHeaderActions";

type Props = {
  barOpacity: Animated.AnimatedInterpolation<number>;
  logoShift: Animated.AnimatedInterpolation<number>;
  compact: boolean;
  schoolLogoUrl?: string;
  schoolName?: string;
};

export const COMPACT_BAR_HEIGHT = 72;

const GRADIENT_STEPS = 18;

function mixHex(from: string, to: string, t: number): string {
  const parse = (hex: string) => {
    const n = parseInt(hex.replace("#", ""), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  const a = parse(from);
  const b = parse(to);
  const c = a.map((v, i) => Math.round(v + (b[i] - v) * t));
  return `#${c.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

export function HomeCompactHeader({
  barOpacity,
  logoShift,
  schoolLogoUrl,
  schoolName,
}: Props) {
  const { colors, spacing } = useParentTheme();
  const insets = useSafeAreaInsets();
  const [logoFailed, setLogoFailed] = useState(false);
  const showLogo = Boolean(schoolLogoUrl) && !logoFailed;

  useEffect(() => {
    setLogoFailed(false);
  }, [schoolLogoUrl]);

  return (
    <View pointerEvents="box-none" style={styles.wrap}>
      <Animated.View
        pointerEvents="none"
        style={[styles.barBg, { opacity: barOpacity }]}
      >
        <View style={styles.gradientRow}>
          {Array.from({ length: GRADIENT_STEPS }, (_, i) => (
            <View
              key={i}
              style={{
                flex: 1,
                backgroundColor: mixHex(
                  colors.headerGradient[0],
                  colors.headerGradient[1],
                  i / (GRADIENT_STEPS - 1),
                ),
              }}
            />
          ))}
        </View>
      </Animated.View>
      <View
        style={{ paddingTop: insets.top, paddingHorizontal: spacing.lg }}
        pointerEvents="box-none"
      >
        <View style={styles.bar} pointerEvents="box-none">
          <Animated.View
            style={[
              styles.logoWrap,
              { transform: [{ translateY: logoShift }] },
            ]}
            pointerEvents="none"
          >
            {schoolName || showLogo ? (
              <View style={styles.brand}>
                {showLogo ? (
                  <Image
                    source={{
                      uri: schoolLogoUrl,
                      headers: { "ngrok-skip-browser-warning": "true" },
                    }}
                    style={styles.logo}
                    resizeMode="contain"
                    onError={() => setLogoFailed(true)}
                  />
                ) : (
                  <MaterialCommunityIcons
                    name="school"
                    size={28}
                    color={colors.headerOn}
                  />
                )}
                {schoolName ? (
                  <Text
                    style={[styles.schoolName, { color: colors.headerOn }]}
                    numberOfLines={2}
                  >
                    {schoolName}
                  </Text>
                ) : null}
              </View>
            ) : null}
          </Animated.View>
          <View style={styles.actions}>
            <TabHeaderActions />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    elevation: 12,
  },
  barBg: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
    shadowColor: "#2D3142",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  gradientRow: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: "row",
  },
  bar: {
    height: COMPACT_BAR_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
  },
  logoWrap: {
    flex: 1,
    height: COMPACT_BAR_HEIGHT,
    justifyContent: "center",
    alignItems: "flex-start",
    paddingRight: 12,
  },
  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    maxWidth: "100%",
    minWidth: 0,
  },
  logo: {
    height: 52,
    width: 52,
    borderRadius: 10,
  },
  schoolName: {
    flex: 1,
    flexShrink: 1,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "800",
    letterSpacing: 0.2,
    textShadowColor: "rgba(0,0,0,0.35)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
  },
});
