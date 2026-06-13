import { useEffect, useState } from 'react';
import { BottomNavigation, useTheme } from 'react-native-paper';
import { HomeScreen } from '../screens/HomeScreen';
import { FamilyScheduleScreen } from '../screens/FamilyScheduleScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { AppTheme } from '../../theme';
import { useAppLanguage } from '../../common';
import { TabNavigationProvider } from './TabNavigationContext';
import { registerTabNavigateHandler, unregisterTabNavigateHandler } from './navigationRef';
import { useSelectionStore } from '../store/selectionStore';

export type MainTabParamList = {
  Home: undefined;
  Schedule: undefined;
  Profile: undefined;
};

export function MainTabs() {
  const theme = useTheme() as AppTheme;
  const { t } = useAppLanguage();
  const hydrateSelection = useSelectionStore((s) => s.hydrate);
  const setSelectedStudentId = useSelectionStore((s) => s.setSelectedStudentId);

  const [index, setIndex] = useState(0);

  useEffect(() => {
    void hydrateSelection();
  }, [hydrateSelection]);

  useEffect(() => {
    registerTabNavigateHandler(({ tab, studentId }) => {
      const tabIndex = tab === 'Profile' ? 2 : tab === 'Schedule' ? 1 : 0;
      setIndex(tabIndex);
      if (studentId != null) {
        setSelectedStudentId(studentId);
      }
    });
    return () => unregisterTabNavigateHandler();
  }, [setSelectedStudentId]);

  const routes = [
    {
      key: 'home',
      title: t('nav.home'),
      focusedIcon: 'home-variant',
      unfocusedIcon: 'home-variant-outline',
    },
    {
      key: 'schedule',
      title: t('nav.schedule'),
      focusedIcon: 'calendar-clock',
      unfocusedIcon: 'calendar-clock-outline',
    },
    {
      key: 'profile',
      title: t('nav.profile'),
      focusedIcon: 'account-circle',
      unfocusedIcon: 'account-circle-outline',
    },
  ];

  const renderScene = BottomNavigation.SceneMap({
    home: HomeScreen,
    schedule: FamilyScheduleScreen,
    profile: ProfileScreen,
  });

  return (
    <TabNavigationProvider index={index} setIndex={setIndex}>
      <BottomNavigation
        navigationState={{ index, routes }}
        onIndexChange={setIndex}
        renderScene={renderScene}
        barStyle={{
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.outlineVariant,
          borderTopWidth: 1,
        }}
      />
    </TabNavigationProvider>
  );
}
