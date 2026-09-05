import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { colors, radius, shadows, spacing } from '../../theme/appTheme';
import { Avatar } from '../ui/Avatar';
import { NotificationBellButton } from '../NotificationBellButton';
import { HeaderSchoolArt } from './HeaderSchoolArt';

export type ChildHeaderTab = 'dashboard' | 'academics' | 'attendance' | 'homework' | 'more';

const TABS: {
  id: ChildHeaderTab;
  label: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  iconActive: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
}[] = [
  { id: 'dashboard', label: 'Dashboard', icon: 'view-grid-outline', iconActive: 'view-grid' },
  { id: 'academics', label: 'Academics', icon: 'school-outline', iconActive: 'school' },
  { id: 'attendance', label: 'Attendance', icon: 'calendar-check-outline', iconActive: 'calendar-check' },
  { id: 'homework', label: 'Homework', icon: 'book-open-page-variant-outline', iconActive: 'book-open-page-variant' },
  { id: 'more', label: 'More', icon: 'dots-horizontal-circle-outline', iconActive: 'dots-horizontal-circle' },
];

function formatMeta(className?: string | null, sectionName?: string | null, fallback?: string | null) {
  const parts: string[] = [];
  if (className) {
    parts.push(/class/i.test(className) ? className : `Class ${className}`);
  }
  if (sectionName) {
    parts.push(/section/i.test(sectionName) ? sectionName : `Section ${sectionName}`);
  }
  if (parts.length) return parts.join(' • ');
  return fallback || '';
}

export function ChildHeroHeader({
  name,
  className,
  sectionName,
  fallbackMeta,
  activeTab,
  onTabChange,
  onBellPress,
}: {
  name: string;
  className?: string | null;
  sectionName?: string | null;
  fallbackMeta?: string | null;
  activeTab: ChildHeaderTab;
  onTabChange: (tab: ChildHeaderTab) => void;
  onBellPress: () => void;
}) {
  const meta = formatMeta(className, sectionName, fallbackMeta);

  return (
    <View style={styles.wrap}>
      <SafeAreaView edges={['top']} style={styles.safe}>
        <View style={styles.hero}>
          <View pointerEvents="none" style={styles.blobA} />
          <View pointerEvents="none" style={styles.blobB} />
          <View style={styles.topRow}>
            <Avatar name={name} size={52} />
            <View style={styles.info}>
              <View style={styles.nameRow}>
                <Text style={styles.name} numberOfLines={1}>
                  {name}
                </Text>
                <View style={styles.activePill}>
                  <Text style={styles.activeText}>Active</Text>
                </View>
              </View>
              {meta ? (
                <Text style={styles.meta} numberOfLines={1}>
                  {meta}
                </Text>
              ) : null}
            </View>
            <NotificationBellButton onPress={onBellPress} variant="well" />
          </View>
          <View style={styles.art}>
            <HeaderSchoolArt />
          </View>
        </View>
      </SafeAreaView>

      <View style={styles.navCard}>
        {TABS.map((tab) => {
          const active = tab.id === activeTab;
          return (
            <Pressable
              key={tab.id}
              onPress={() => onTabChange(tab.id)}
              style={styles.navItem}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={tab.label}
            >
              <MaterialCommunityIcons
                name={active ? tab.iconActive : tab.icon}
                size={22}
                color={active ? colors.primary : '#2F2B4A'}
              />
              <Text style={[styles.navLabel, active && styles.navLabelActive]} numberOfLines={1}>
                {tab.label}
              </Text>
              <View style={[styles.indicator, active && styles.indicatorOn]} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: colors.background, paddingBottom: 8 },
  safe: { backgroundColor: colors.primary },
  hero: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: 36,
    overflow: 'hidden',
  },
  blobA: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: colors.primaryDark,
    opacity: 0.35,
    right: -70,
    top: -90,
  },
  blobB: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.12)',
    left: -40,
    bottom: -30,
  },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 12, zIndex: 2 },
  info: { flex: 1, minWidth: 0, paddingRight: 56 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: {
    flexShrink: 1,
    color: colors.headerOn,
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  activePill: {
    backgroundColor: '#4ADE80',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  activeText: { color: colors.headerOn, fontSize: 11, fontWeight: '700' },
  meta: {
    marginTop: 4,
    color: 'rgba(255,255,255,0.88)',
    fontSize: 13,
    fontWeight: '500',
  },
  art: { position: 'absolute', right: 18, bottom: 28 },
  navCard: {
    marginTop: -22,
    marginHorizontal: spacing.base,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    flexDirection: 'row',
    paddingHorizontal: 4,
    paddingTop: 12,
    paddingBottom: 8,
    ...shadows.card,
    zIndex: 3,
  },
  navItem: { flex: 1, alignItems: 'center', gap: 4, minHeight: 56 },
  navLabel: { fontSize: 10, fontWeight: '600', color: '#2F2B4A' },
  navLabelActive: { color: colors.primary, fontWeight: '800' },
  indicator: { height: 3, width: 22, borderRadius: 2, backgroundColor: 'transparent', marginTop: 4 },
  indicatorOn: { backgroundColor: colors.primary },
});
