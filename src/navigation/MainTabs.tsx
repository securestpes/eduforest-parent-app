import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { HomeScreen } from '../screens/HomeScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { AttendanceScreen } from '../screens/AttendanceScreen';
import { FeesScreen } from '../screens/FeesScreen';
import { StudyScreen } from '../features/study/screens/StudyScreen';
import { TabNavigationProvider } from './TabNavigationContext';
import {
  registerTabNavigateHandler,
  unregisterTabNavigateHandler,
} from './navigationRef';
import { useSelectionStore } from '../store/selectionStore';
import { MainTabBar, type MainTabKey } from './MainTabBar';
import { colors } from '../theme/appTheme';

export type MainTabParamList = {
  Home: undefined;
  Attendance: undefined;
  Study: undefined;
  Fees: undefined;
  More: undefined;
};

const KEYS: MainTabKey[] = ['home', 'attendance', 'study', 'fees', 'more'];

export function MainTabs() {
  const hydrateSelection = useSelectionStore((s) => s.hydrate);
  const setSelectedStudentId = useSelectionStore((s) => s.setSelectedStudentId);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    void hydrateSelection();
  }, [hydrateSelection]);

  useEffect(() => {
    registerTabNavigateHandler(({ tab, studentId }) => {
      const map: Record<string, number> = {
        Home: 0,
        Attendance: 1,
        Study: 2,
        Fees: 3,
        More: 4,
        Profile: 4,
      };
      setIndex(map[tab] ?? 0);
      if (studentId != null) setSelectedStudentId(studentId);
    });
    return () => unregisterTabNavigateHandler();
  }, [setSelectedStudentId]);

  const active = KEYS[index] ?? 'home';

  return (
    <TabNavigationProvider index={index} setIndex={setIndex}>
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={{ flex: 1, display: index === 0 ? 'flex' : 'none' }}>
          <HomeScreen />
        </View>
        <View style={{ flex: 1, display: index === 1 ? 'flex' : 'none' }}>
          <AttendanceScreen />
        </View>
        <View style={{ flex: 1, display: index === 2 ? 'flex' : 'none' }}>
          <StudyScreen />
        </View>
        <View style={{ flex: 1, display: index === 3 ? 'flex' : 'none' }}>
          <FeesScreen />
        </View>
        <View style={{ flex: 1, display: index === 4 ? 'flex' : 'none' }}>
          <ProfileScreen />
        </View>
        <MainTabBar active={active} onChange={(key) => setIndex(KEYS.indexOf(key))} />
      </View>
    </TabNavigationProvider>
  );
}
