import React, { useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useAppColors } from '../theme/appTheme';
import { useAppLanguage, useAppTheme } from '../common';

export type MainTabKey = 'home' | 'attendance' | 'fees' | 'calendar' | 'settings';

export const MAIN_TAB_CONTENT_INSET = 108;

const TABS: MainTabKey[] = ['home', 'attendance', 'fees', 'calendar', 'settings'];
const DOCK_H_PAD = 8;
const PILL_INSET = 2;

function TabButton({
  focused,
  label,
  icon,
  iconActive,
  isHome,
  color,
  muted,
  onPress,
}: {
  focused: boolean;
  label: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  iconActive: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  isHome: boolean;
  color: string;
  muted: string;
  onPress: () => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const lift = useRef(new Animated.Value(focused && isHome ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(lift, {
      toValue: focused && isHome ? 1 : 0,
      useNativeDriver: true,
      friction: 7,
      tension: 80,
    }).start();
  }, [focused, isHome, lift]);

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => {
        Animated.spring(scale, {
          toValue: 0.9,
          useNativeDriver: true,
          friction: 6,
          tension: 160,
        }).start();
      }}
      onPressOut={() => {
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: true,
          friction: 6,
          tension: 120,
        }).start();
      }}
      style={styles.item}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: focused }}
    >
      <Animated.View
        style={{
          alignItems: 'center',
          width: '100%',
          transform: [
            { scale },
            {
              translateY: lift.interpolate({
                inputRange: [0, 1],
                outputRange: [0, -2],
              }),
            },
          ],
        }}
      >
        <MaterialCommunityIcons
          name={focused ? iconActive : icon}
          size={isHome ? 24 : 22}
          color={focused ? color : muted}
        />
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.8}
          style={[
            styles.label,
            {
              color: focused ? color : muted,
              fontWeight: focused ? '800' : '600',
              opacity: focused ? 1 : 0.85,
            },
          ]}
        >
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

export function MainTabBar({
  active,
  onChange,
}: {
  active: MainTabKey;
  onChange: (key: MainTabKey) => void;
}) {
  const insets = useSafeAreaInsets();
  const colors = useAppColors();
  const { isDark } = useAppTheme();
  const { t } = useAppLanguage();
  const trackWidth = useRef(0);
  const pillX = useRef(new Animated.Value(TABS.indexOf(active))).current;
  const pillW = useRef(new Animated.Value(0)).current;

  const tabs = useMemo(
    () =>
      [
        {
          key: 'home' as const,
          label: t('nav.home'),
          icon: 'home-outline' as const,
          iconActive: 'home' as const,
        },
        {
          key: 'attendance' as const,
          label: t('childChips.attendance'),
          icon: 'calendar-check-outline' as const,
          iconActive: 'calendar-check' as const,
        },
        {
          key: 'fees' as const,
          label: t('childChips.fees'),
          icon: 'currency-inr' as const,
          iconActive: 'currency-inr' as const,
        },
        {
          key: 'calendar' as const,
          label: t('childChips.calendar'),
          icon: 'calendar-month-outline' as const,
          iconActive: 'calendar-month' as const,
        },
        {
          key: 'settings' as const,
          label: t('nav.settings'),
          icon: 'cog-outline' as const,
          iconActive: 'cog' as const,
        },
      ],
    [t]
  );

  const movePill = (index: number, width: number) => {
    const inner = Math.max(0, width - DOCK_H_PAD * 2);
    const slot = inner / TABS.length;
    Animated.parallel([
      Animated.timing(pillX, {
        toValue: DOCK_H_PAD + index * slot + PILL_INSET,
        duration: 320,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.spring(pillW, {
        toValue: Math.max(0, slot - PILL_INSET * 2),
        useNativeDriver: false,
        friction: 8,
        tension: 80,
      }),
    ]).start();
  };

  useEffect(() => {
    if (trackWidth.current > 0) {
      movePill(Math.max(0, TABS.indexOf(active)), trackWidth.current);
    }
  }, [active]);

  const blurTint = isDark ? 'systemThickMaterialDark' : 'systemThickMaterialLight';

  return (
    <View pointerEvents="box-none" style={styles.overlay}>
      <View
        style={[
          styles.dockShadow,
          { marginBottom: Math.max(insets.bottom, 10) },
        ]}
      >
        <View
          style={[
            styles.dock,
            {
              borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(230,232,238,0.95)',
            },
          ]}
          onLayout={(e) => {
            const w = e.nativeEvent.layout.width;
            trackWidth.current = w;
            movePill(Math.max(0, TABS.indexOf(active)), w);
          }}
        >
          <BlurView
            intensity={isDark ? 55 : 80}
            tint={blurTint}
            experimentalBlurMethod="dimezisBlurView"
            style={StyleSheet.absoluteFill}
          />
          <View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFill,
              {
                backgroundColor: isDark
                  ? 'rgba(22,22,34,0.82)'
                  : 'rgba(255,255,255,0.88)',
              },
            ]}
          />
          <LinearGradient
            pointerEvents="none"
            colors={
              isDark
                ? ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0)']
                : ['rgba(255,255,255,0.5)', 'rgba(255,255,255,0)']
            }
            style={styles.shine}
          />

          <Animated.View
            pointerEvents="none"
            style={[
              styles.pill,
              {
                width: pillW,
                left: pillX,
                backgroundColor: isDark ? 'rgba(139,124,255,0.28)' : 'rgba(107,92,231,0.16)',
                borderColor: isDark ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.7)',
              },
            ]}
          />

          {tabs.map((tab) => (
            <TabButton
              key={tab.key}
              focused={active === tab.key}
              label={tab.label}
              icon={tab.icon}
              iconActive={tab.iconActive}
              isHome={tab.key === 'home'}
              color={colors.primary}
              muted={colors.textTertiary}
              onPress={() => onChange(tab.key)}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 30,
    alignItems: 'center',
  },
  dockShadow: {
    width: '94%',
    maxWidth: 520,
    borderRadius: 30,
    ...Platform.select({
      ios: {
        shadowColor: '#1E1B3A',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.16,
        shadowRadius: 24,
      },
      android: { elevation: 16 },
      default: {},
    }),
  },
  dock: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 64,
    paddingHorizontal: DOCK_H_PAD,
    paddingVertical: 6,
    borderRadius: 30,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  shine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 22,
  },
  pill: {
    position: 'absolute',
    top: 6,
    bottom: 6,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: 4,
    zIndex: 1,
  },
  label: {
    marginTop: 3,
    fontSize: 10,
    letterSpacing: -0.2,
    maxWidth: '100%',
    textAlign: 'center',
  },
});
