import React from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { AppTheme } from '../../theme';
import { useAppLanguage, type TranslationKey } from '../../common';

export type ChildChipAction =
  | 'attendance'
  | 'schedule'
  | 'notifications'
  | 'report'
  | 'homework'
  | 'assessment';

type ChipDef = {
  action: ChildChipAction;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  labelKey: TranslationKey;
  enabled: boolean;
};

const CHIPS: ChipDef[] = [
  { action: 'attendance', icon: 'calendar-check', labelKey: 'childChips.attendance', enabled: true },
  { action: 'schedule', icon: 'calendar-clock', labelKey: 'childChips.schedule', enabled: true },
  { action: 'notifications', icon: 'bell-ring-outline', labelKey: 'childChips.notifications', enabled: true },
  { action: 'report', icon: 'file-chart-outline', labelKey: 'childChips.report', enabled: false },
  { action: 'homework', icon: 'book-open-outline', labelKey: 'childChips.homework', enabled: false },
  { action: 'assessment', icon: 'clipboard-check-outline', labelKey: 'childChips.assessment', enabled: false },
];

type Props = {
  onPress: (action: ChildChipAction) => void;
  selected?: ChildChipAction;
  variant?: 'card' | 'hub';
};

export function ChildActionChips({ onPress, selected, variant = 'card' }: Props) {
  const theme = useTheme() as AppTheme;
  const { t } = useAppLanguage();

  const handlePress = (chip: ChipDef) => {
    if (!chip.enabled) {
      Alert.alert('', t('childChips.comingSoon'));
      return;
    }
    onPress(chip.action);
  };

  const isHub = variant === 'hub';

  return (
    <View
      style={[
        isHub ? styles.wrapHub : styles.wrap,
        { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant },
      ]}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {CHIPS.map((chip) => {
          const isSelected = chip.enabled && selected === chip.action;
          return (
          <Pressable
            key={chip.action}
            onPress={() => handlePress(chip)}
            style={({ pressed }) => [
              styles.chip,
              {
                backgroundColor: isSelected
                  ? theme.colors.primary
                  : chip.enabled
                    ? theme.colors.primaryContainer
                    : theme.colors.surfaceVariant,
                opacity: pressed ? 0.88 : chip.enabled ? 1 : 0.72,
                borderWidth: isSelected ? 0 : isHub ? 1 : 0,
                borderColor: theme.colors.outlineVariant,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel={t(chip.labelKey)}
          >
            <MaterialCommunityIcons
              name={chip.icon}
              size={22}
              color={
                isSelected
                  ? theme.colors.onPrimary
                  : chip.enabled
                    ? theme.colors.primary
                    : theme.colors.onSurfaceVariant
              }
            />
            <Text
              variant="labelMedium"
              style={{
                color: isSelected
                  ? theme.colors.onPrimary
                  : chip.enabled
                    ? theme.colors.primary
                    : theme.colors.onSurfaceVariant,
                fontWeight: '700',
                marginTop: 6,
                textAlign: 'center',
              }}
            >
              {t(chip.labelKey)}
            </Text>
          </Pressable>
        );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderWidth: 1,
    borderTopWidth: 0,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 14,
    marginTop: -12,
    marginBottom: 12,
  },
  wrapHub: {
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 14,
    marginBottom: 4,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 12,
  },
  chip: {
    minWidth: 96,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
});
