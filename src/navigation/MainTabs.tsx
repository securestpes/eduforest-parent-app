import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React, { useState } from 'react';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { BottomNavigation, useTheme } from 'react-native-paper';
import { HomeScreen } from '../screens/HomeScreen';
import { NotificationsScreen } from '../screens/NotificationsScreen';
import { AttendanceScreen } from '../screens/AttendanceScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import type { AppTheme } from '../../theme';
import { useAppLanguage } from '../../common';
import { OpaqueColorValue } from 'react-native';

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
      focusedIcon: ({
        size,
        color,
      }: {
        size: number;
        color: string | OpaqueColorValue;
      }) => (
        <MaterialCommunityIcons
          name="home-variant-outline"
          size={size}
          color={color}
        />
      ),
      // unfocusedIcon: '',
    },
    {
      key: 'notifications',
      title: t('nav.alerts'),
      focusedIcon: ({
        size,
        color,
      }: {
        size: number;
        color: string | OpaqueColorValue;
      }) => (
        <MaterialCommunityIcons
          name="bell-ring-outline"
          size={size}
          color={color}
        />
      ),
      // unfocusedIcon: '',
    },
    {
      key: 'attendance',
      title: t('nav.attendance'),
      focusedIcon: ({
        size,
        color,
      }: {
        size: number;
        color: string | OpaqueColorValue;
      }) => (
        <MaterialCommunityIcons
          name="calendar-check"
          size={size}
          color={color}
        />
      ),
      // unfocusedIcon: 'cog-outline', // just use the string if no color/props
    },
    {
      key: 'profile',
      title: t('nav.profile'),
      focusedIcon: ({
        size,
        color,
      }: {
        size: number;
        color: string | OpaqueColorValue;
      }) => (
        <MaterialCommunityIcons
          name="account-circle-outline"
          size={size}
          color={color}
        />
      ),
      // unfocusedIcon: '', // just use the string if no color/props
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
