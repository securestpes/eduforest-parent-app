import React from 'react';
import { StyleSheet, View } from 'react-native';
// import { Pressable } from 'react-native';
// import { useNavigation } from '@react-navigation/native';
// import type { NavigationProp } from '@react-navigation/native';
// import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { NotificationBellButton } from './NotificationBellButton';
import { openNotificationCenter } from '../services/openNotificationCenter';
// import { useAppLanguage } from '../common';
import { colors } from '../theme/appTheme';
// import type { RootStackParamList } from '../navigation/Navigation';

/** Bell on main tab headers. Profile icon is temporarily hidden. */
export function TabHeaderActions() {
  // const { t } = useAppLanguage();
  // const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  return (
    <View style={styles.row}>
      <NotificationBellButton
        onPress={() => void openNotificationCenter()}
        variant="well"
      />
      {/* <Pressable
        onPress={() => navigation.navigate('Profile')}
        hitSlop={8}
        style={styles.well}
        accessibilityRole="button"
        accessibilityLabel={t('nav.profile')}
      >
        <MaterialCommunityIcons
          name="account-outline"
          size={22}
          color={colors.headerOn}
        />
      </Pressable> */}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  well: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.overlay,
  },
});
