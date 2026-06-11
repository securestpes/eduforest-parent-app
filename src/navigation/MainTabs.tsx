import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useState } from 'react';
import { BottomNavigation, useTheme } from 'react-native-paper';
import { HomeScreen } from '../screens/HomeScreen';
import { NotificationsScreen } from '../screens/NotificationsScreen';
import { AttendanceScreen } from '../screens/AttendanceScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { AppTheme } from '../../theme';
import { useAppLanguage } from '../../common';

export type MainTabParamList = {
  Home: undefined;
  Notifications: undefined;
  Attendance: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

export function MainTabs() {
  const theme = useTheme() as AppTheme;
  const { t } = useAppLanguage();

  const [index, setIndex] = useState(0);
  const routes = [
    {
      key: 'home',
      title: t('nav.home'),
      focusedIcon: 'home-variant',
      unfocusedIcon: 'home-variant-outline',
    },
    {
      key: 'notifications',
      title: t('nav.alerts'),
      focusedIcon: 'bell-ring',
      unfocusedIcon: 'bell-ring-outline',
    },
    {
      key: 'attendance',
      title: t('nav.attendance'),
      focusedIcon: 'calendar-check',
      unfocusedIcon: 'calendar-check-outline', // just use the string if no color/props
    },
    {
      key: 'profile',
      title: t('nav.profile'),
      focusedIcon: 'account-circle',
      unfocusedIcon: 'account-circle-outline', // just use the string if no color/props
    },
  ];

  const renderScene = BottomNavigation.SceneMap({
    home: HomeScreen,
    notifications: NotificationsScreen,
    attendance: AttendanceScreen,
    profile: ProfileScreen,
  });

  return (
    <BottomNavigation
      navigationState={{ index, routes }}
      onIndexChange={setIndex}
      renderScene={renderScene}
      barStyle={{
        backgroundColor: theme.palette.card4_alpha,
      }}
    />
  );
}
