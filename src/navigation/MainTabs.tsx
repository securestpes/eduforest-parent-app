import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { HomeScreen } from '../screens/HomeScreen';
import { SchoolCalendarScreen } from '../screens/SchoolCalendarScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { AttendanceScreen } from '../screens/AttendanceScreen';
import { FeesScreen } from '../screens/FeesScreen';
import { TabNavigationProvider } from './TabNavigationContext';
import {
  registerTabNavigateHandler,
  unregisterTabNavigateHandler,
} from './navigationRef';
import { useSelectionStore } from '../store/selectionStore';
import { MainTabBar, type MainTabKey } from './MainTabBar';
import { useAppColors } from '../theme/appTheme';

export type MainTabParamList = {
  Home: undefined;
  Attendance: undefined;
  Fees: undefined;
  Calendar: undefined;
  Settings: undefined;
};

const KEYS: MainTabKey[] = ['attendance', 'fees', 'home', 'calendar', 'settings'];

export function MainTabs() {
  const hydrateSelection = useSelectionStore((s) => s.hydrate);
  const setSelectedStudentId = useSelectionStore((s) => s.setSelectedStudentId);
  const [index, setIndex] = useState(2);

  useEffect(() => {
    void hydrateSelection();
  }, [hydrateSelection]);

  useEffect(() => {
    registerTabNavigateHandler(({ tab, studentId }) => {
      const map: Record<string, number> = {
        Attendance: 0,
        Fees: 1,
        Home: 2,
        Calendar: 3,
        Settings: 4,
        More: 4,
      };
      setIndex(map[tab] ?? 2);
      if (studentId != null) setSelectedStudentId(studentId);
    });
    return () => unregisterTabNavigateHandler();
  }, [setSelectedStudentId]);

  const active = KEYS[index] ?? 'home';
  const colors = useAppColors();
  const attendanceHighlight = useSelectionStore((s) => s.attendanceHighlight);

  return (
    <TabNavigationProvider index={index} setIndex={setIndex}>
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={{ flex: 1, display: index === 0 ? 'flex' : 'none' }}>
          <AttendanceScreen
            highlightAttendanceId={attendanceHighlight?.highlightAttendanceId}
            highlightSessionDate={attendanceHighlight?.highlightSessionDate}
          />
        </View>
        <View style={{ flex: 1, display: index === 1 ? 'flex' : 'none' }}>
          <FeesScreen />
        </View>
        <View style={{ flex: 1, display: index === 2 ? 'flex' : 'none' }}>
          <HomeScreen />
        </View>
        <View style={{ flex: 1, display: index === 3 ? 'flex' : 'none' }}>
          <SchoolCalendarScreen />
        </View>
        <View style={{ flex: 1, display: index === 4 ? 'flex' : 'none' }}>
          <ProfileScreen variant="settings" />
        </View>
        <MainTabBar active={active} onChange={(key) => setIndex(KEYS.indexOf(key))} />
      </View>
    </TabNavigationProvider>
  );
}
