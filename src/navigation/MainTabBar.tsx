import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { shadows, useAppColors } from '../theme/appTheme';
import { useAppLanguage } from '../common';

export type MainTabKey = 'home' | 'attendance' | 'fees' | 'calendar' | 'settings';

export function MainTabBar({
  active,
  onChange,
}: {
  active: MainTabKey;
  onChange: (key: MainTabKey) => void;
}) {
  const insets = useSafeAreaInsets();
  const colors = useAppColors();
  const { t } = useAppLanguage();

  const tabs: {
    key: MainTabKey;
    label: string;
    icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
    iconActive: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  }[] = [
    { key: 'attendance', label: t('childChips.attendance'), icon: 'calendar-check-outline', iconActive: 'calendar-check' },
    { key: 'fees', label: t('childChips.fees'), icon: 'currency-inr', iconActive: 'currency-inr' },
    { key: 'home', label: t('nav.home'), icon: 'home-outline', iconActive: 'home' },
    { key: 'calendar', label: t('childChips.calendar'), icon: 'calendar-month-outline', iconActive: 'calendar-month' },
    { key: 'settings', label: t('nav.settings'), icon: 'cog-outline', iconActive: 'cog' },
  ];

  return (
    <View
      style={[
        styles.bar,
        { paddingBottom: Math.max(insets.bottom, 8), backgroundColor: colors.surface },
        shadows.tab,
      ]}
    >
      {tabs.map((tab) => {
        const focused = active === tab.key;
        if (tab.key === 'home') {
          return (
            <Pressable
              key={tab.key}
              onPress={() => onChange(tab.key)}
              style={styles.centerWrap}
              accessibilityRole="button"
              accessibilityLabel={tab.label}
              accessibilityState={{ selected: focused }}
            >
              <View
                style={[
                  styles.centerBtn,
                  { backgroundColor: focused ? colors.primaryDark : colors.primary, borderColor: colors.surface },
                ]}
              >
                <MaterialCommunityIcons name={tab.iconActive} size={26} color={colors.headerOn} />
              </View>
              <Text style={[styles.label, { color: focused ? colors.primary : colors.textTertiary }]}>
                {tab.label}
              </Text>
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
            <Text style={[styles.label, { color: focused ? colors.primary : colors.textTertiary, fontWeight: focused ? '800' : '600' }]}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
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
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
  },
  label: { fontSize: 11, fontWeight: '600' },
});
