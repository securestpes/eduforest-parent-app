import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useState,
} from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  useNavigation,
  useRoute,
  type NavigationProp,
  type RouteProp,
} from '@react-navigation/native';
import { getMyStudents, type ParentStudent } from '../services/parent';
import { useSelectionStore } from '../store/selectionStore';
import { resetLocalBadgeCount } from '../services/localNotificationBadge';
import { ScreenDecor } from '../components/ScreenDecor';
import {
  ChildActionChips,
  type ChildChipAction,
} from '../components/ChildActionChips';
import { AttendanceScreen } from './AttendanceScreen';
import { NotificationsScreen } from './NotificationsScreen';
import { ScheduleScreen } from './ScheduleScreen';
import type { RootStackParamList } from '../navigation/Navigation';
import { useAppLanguage } from '../common';

const ENABLED_SECTIONS: ChildChipAction[] = [
  'attendance',
  'schedule',
  'notifications',
];

function isEnabledSection(
  section: ChildChipAction
): section is (typeof ENABLED_SECTIONS)[number] {
  return ENABLED_SECTIONS.includes(section);
}

export function ChildHubScreen() {
  const { t } = useAppLanguage();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'ChildHub'>>();

  const studentId = useSelectionStore((s) => s.selectedStudentId);
  const setSelectedStudentId = useSelectionStore((s) => s.setSelectedStudentId);

  const [students, setStudents] = useState<ParentStudent[]>([]);
  const [section, setSection] = useState<ChildChipAction>(
    route.params?.section ?? 'attendance'
  );

  const loadStudents = useCallback(async () => {
    const res = await getMyStudents();
    if (res.status && Array.isArray(res.data)) {
      setStudents(res.data);
    } else {
      setStudents([]);
    }
  }, []);

  useEffect(() => {
    if (route.params?.studentId != null) {
      setSelectedStudentId(route.params.studentId);
    }
    if (route.params?.section) {
      setSection(route.params.section);
    }
  }, [route.params?.studentId, route.params?.section, setSelectedStudentId]);

  useEffect(() => {
    void loadStudents();
  }, [loadStudents]);

  const selectedStudent = students.find((s) => s.id === studentId) ?? null;

  useLayoutEffect(() => {
    navigation.setOptions({
      title: selectedStudent?.name ?? t('childHub.title'),
    });
  }, [navigation, selectedStudent?.name, t]);

  return (
    <ScreenDecor>
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={styles.header}>
          <ChildActionChips
            variant="hub"
            selected={section}
            onPress={(action) => {
              if (isEnabledSection(action)) {
                if (action === 'notifications') {
                  void resetLocalBadgeCount();
                }
                setSection(action);
              }
            }}
          />
        </View>

        <View style={styles.content}>
          {section === 'attendance' ? <AttendanceScreen embedded /> : null}
          {section === 'notifications' ? (
            <NotificationsScreen
              embedded
              onSwitchToAttendance={() => setSection('attendance')}
            />
          ) : null}
          {section === 'schedule' ? <ScheduleScreen embedded /> : null}
        </View>
      </SafeAreaView>
    </ScreenDecor>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
    gap: 8,
  },
  content: { flex: 1 },
});
