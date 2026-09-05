import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { colors, shadows } from '../theme/appTheme';

export type MainTabKey = 'home' | 'attendance' | 'study' | 'fees' | 'more';

const TABS: {
  key: MainTabKey;
  label: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  iconActive: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
}[] = [
  { key: 'home', label: 'Home', icon: 'home-outline', iconActive: 'home' },
  { key: 'attendance', label: 'Attendance', icon: 'calendar-check-outline', iconActive: 'calendar-check' },
  { key: 'study', label: 'Study', icon: 'book-open-page-variant', iconActive: 'book-open-page-variant' },
  { key: 'fees', label: 'Fees', icon: 'currency-inr', iconActive: 'currency-inr' },
  { key: 'more', label: 'More', icon: 'dots-horizontal', iconActive: 'dots-horizontal' },
];

export function MainTabBar({
  active,
  onChange,
}: {
  active: MainTabKey;
  onChange: (key: MainTabKey) => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 8) }, shadows.tab]}>
      {TABS.map((tab) => {
        const focused = active === tab.key;
        if (tab.key === 'study') {
          return (
            <Pressable
              key={tab.key}
              onPress={() => onChange(tab.key)}
              style={styles.centerWrap}
              accessibilityRole="button"
              accessibilityLabel="Study"
              accessibilityState={{ selected: focused }}
            >
              <View style={[styles.centerBtn, focused && styles.centerBtnActive]}>
                <MaterialCommunityIcons name={tab.iconActive} size={26} color={colors.headerOn} />
              </View>
              <Text style={[styles.label, focused && styles.labelActive]}>{tab.label}</Text>
            </Pressable>
          );
        }
        return (
          <Pressable
            key={tab.key}
            onPress={() => onChange(tab.key)}
            style={styles.item}
            accessibilityRole="button"
            accessibilityLabel={tab.label}
            accessibilityState={{ selected: focused }}
          >
            <MaterialCommunityIcons
              name={focused ? tab.iconActive : tab.icon}
              size={22}
              color={focused ? colors.primary : colors.textTertiary}
            />
            <Text style={[styles.label, focused && styles.labelActive]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    paddingTop: 8,
    paddingHorizontal: 8,
    alignItems: 'flex-end',
  },
  item: { flex: 1, alignItems: 'center', gap: 4, minHeight: 48, justifyContent: 'center' },
  centerWrap: { flex: 1, alignItems: 'center', marginTop: -28 },
  centerBtn: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: colors.surface,
  },
  centerBtnActive: { backgroundColor: colors.primaryDark },
  label: { fontSize: 11, fontWeight: '600', color: colors.textTertiary },
  labelActive: { color: colors.primary, fontWeight: '800' },
});
