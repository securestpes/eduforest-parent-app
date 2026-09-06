import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useState,
} from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
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
import type { ChildChipAction } from '../components/ChildActionChips';
import { AttendanceScreen } from './AttendanceScreen';
import { NotificationsScreen } from './NotificationsScreen';
import { HomeworkScreen } from './HomeworkScreen';
import { SchoolCalendarScreen } from './SchoolCalendarScreen';
import { FeesScreen } from './FeesScreen';
import { ExamResultsScreen } from './ExamResultsScreen';
import { LeaveScreen } from './LeaveScreen';
import type { RootStackParamList } from '../navigation/Navigation';
import { useAppLanguage, type TranslationKey } from '../common';
import type { AppTheme } from '../theme';
import {
  registerChildHubOpenHandler,
  unregisterChildHubOpenHandler,
} from '../navigation/navigationRef';
import { ChildHubRestoreProvider } from '../navigation/ChildHubNavContext';

const ENABLED_SECTIONS: ChildChipAction[] = [
  'attendance',
  'notifications',
  'homework',
  'exams',
  'leaves',
  'calendar',
  'fees',
];

const SECTION_TITLE: Record<(typeof ENABLED_SECTIONS)[number], TranslationKey> =
  {
    attendance: 'childChips.attendance',
    notifications: 'childChips.notifications',
    homework: 'childChips.homework',
    exams: 'childChips.exams',
    leaves: 'childChips.leaves',
    calendar: 'childChips.calendar',
    fees: 'childChips.fees',
  };

function isEnabledSection(
  section: ChildChipAction
): section is (typeof ENABLED_SECTIONS)[number] {
  return ENABLED_SECTIONS.includes(section);
}

export function ChildHubScreen() {
  const { t } = useAppLanguage();
  const theme = useTheme() as AppTheme;
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'ChildHub'>>();

  const studentId = useSelectionStore((s) => s.selectedStudentId);
  const setSelectedStudentId = useSelectionStore((s) => s.setSelectedStudentId);

  const [students, setStudents] = useState<ParentStudent[]>([]);
  const [section, setSection] = useState<ChildChipAction>(
    route.params?.section && isEnabledSection(route.params.section)
      ? route.params.section
      : 'attendance'
  );
  const [sectionStack, setSectionStack] = useState<ChildChipAction[]>(() => {
    const initial =
      route.params?.section && isEnabledSection(route.params.section)
        ? route.params.section
        : 'attendance';
    return route.params?.openedFromNotification && initial !== 'notifications'
      ? ['notifications']
      : [];
  });
  const [attendanceHighlight, setAttendanceHighlight] = useState<{
    highlightAttendanceId?: number;
    highlightSessionDate?: string;
  }>({
    highlightAttendanceId: route.params?.highlightAttendanceId,
    highlightSessionDate: route.params?.highlightSessionDate,
  });
  const [examsTab, setExamsTab] = useState(route.params?.examsTab);
  const [switcherOpen, setSwitcherOpen] = useState(false);

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
  }, [route.params?.studentId, setSelectedStudentId]);

  useEffect(() => {
    if (route.params?.section && isEnabledSection(route.params.section)) {
      const next = route.params.section;
      setSectionStack(
        route.params.openedFromNotification && next !== 'notifications'
          ? ['notifications']
          : []
      );
      setSection(next);
    }
    if (route.params?.examsTab) {
      setExamsTab(route.params.examsTab);
    }
    if (
      route.params?.highlightAttendanceId != null ||
      route.params?.highlightSessionDate
    ) {
      setAttendanceHighlight({
        highlightAttendanceId: route.params.highlightAttendanceId,
        highlightSessionDate: route.params.highlightSessionDate,
      });
    }
  }, [
    route.params?.section,
    route.params?.examsTab,
    route.params?.highlightAttendanceId,
    route.params?.highlightSessionDate,
    route.params?.openedFromNotification,
  ]);

  useEffect(() => {
    void loadStudents();
  }, [loadStudents]);

  const leaveOrRestoreSection = useCallback(() => {
    const prev = sectionStack[sectionStack.length - 1];
    if (!prev) return false;
    setSectionStack((s) => s.slice(0, -1));
    setSection(prev);
    return true;
  }, [sectionStack]);

  useEffect(() => {
    registerChildHubOpenHandler((payload) => {
      const next = payload.section;
      setSection((current) => {
        if (current !== next) {
          setSectionStack((s) => [...s, current]);
        }
        return next;
      });
      if (
        payload.highlightAttendanceId != null ||
        payload.highlightSessionDate
      ) {
        setAttendanceHighlight({
          highlightAttendanceId: payload.highlightAttendanceId,
          highlightSessionDate: payload.highlightSessionDate,
        });
      }
    });
    return () => unregisterChildHubOpenHandler();
  }, []);

  useEffect(() => {
    const unsub = navigation.addListener('beforeRemove', (e) => {
      if (sectionStack.length === 0) return;
      e.preventDefault();
      leaveOrRestoreSection();
    });
    return unsub;
  }, [navigation, leaveOrRestoreSection]);

  useEffect(() => {
    if (section === 'notifications') {
      void resetLocalBadgeCount();
    }
  }, [section]);

  const selectedStudent = students.find((s) => s.id === studentId) ?? null;
  const sectionTitleKey = isEnabledSection(section)
    ? SECTION_TITLE[section]
    : 'childHub.title';
  const ownHeader =
    section === 'homework' ||
    section === 'exams' ||
    section === 'leaves' ||
    section === 'notifications' ||
    section === 'fees' ||
    section === 'attendance' ||
    section === 'calendar';

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: !ownHeader,
      title: selectedStudent
        ? `${selectedStudent.name} · ${t(sectionTitleKey)}`
        : t(sectionTitleKey),
      headerRight:
        !ownHeader && students.length > 1
          ? () => (
              <Pressable
                onPress={() => setSwitcherOpen((v) => !v)}
                style={{ paddingHorizontal: 12, paddingVertical: 6 }}
                accessibilityRole="button"
                accessibilityLabel={t('dashboard.switchChild')}
              >
                <MaterialCommunityIcons
                  name="account-switch-outline"
                  size={22}
                  color={theme.colors.primary}
                />
              </Pressable>
            )
          : undefined,
    });
  }, [
    navigation,
    selectedStudent,
    students.length,
    sectionTitleKey,
    t,
    theme.colors.primary,
    ownHeader,
  ]);

  const keepNotifications =
    section === 'notifications' || sectionStack.includes('notifications');

  return (
    <ChildHubRestoreProvider restore={leaveOrRestoreSection}>
    <ScreenDecor>
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        {switcherOpen && students.length > 1 ? (
          <View
            style={[
              styles.switcherPanel,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.outlineVariant,
              },
            ]}
          >
            {students.map((s) => {
              const selected = s.id === studentId;
              return (
                <Pressable
                  key={s.id}
                  onPress={() => {
                    setSelectedStudentId(s.id);
                    setSwitcherOpen(false);
                  }}
                  style={[
                    styles.switcherRow,
                    selected && { backgroundColor: theme.palette.primarySoft },
                  ]}
                >
                  <Text
                    variant="bodyMedium"
                    style={{
                      color: theme.colors.onSurface,
                      fontWeight: selected ? '700' : '500',
                      flex: 1,
                    }}
                  >
                    {s.name}
                  </Text>
                  {selected ? (
                    <MaterialCommunityIcons
                      name="check"
                      size={18}
                      color={theme.colors.primary}
                    />
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        ) : null}

        <View style={styles.content}>
          {keepNotifications ? (
            <View
              pointerEvents={section === 'notifications' ? 'auto' : 'none'}
              style={
                section === 'notifications'
                  ? styles.content
                  : styles.hiddenNotifications
              }
            >
              <NotificationsScreen embedded />
            </View>
          ) : null}
          {section === 'attendance' ? (
            <View style={styles.content}>
              <AttendanceScreen {...attendanceHighlight} />
            </View>
          ) : null}
          {section === 'homework' ? (
            <View style={styles.content}>
              <HomeworkScreen />
            </View>
          ) : null}
          {section === 'exams' ? (
            <View style={styles.content}>
              <ExamResultsScreen
                key={`${studentId ?? 'none'}-${examsTab ?? 'auto'}`}
                embedded
                initialTab={examsTab}
              />
            </View>
          ) : null}
          {section === 'leaves' ? (
            <View style={styles.content}>
              <LeaveScreen />
            </View>
          ) : null}
          {section === 'calendar' ? (
            <View style={styles.content}>
              <SchoolCalendarScreen />
            </View>
          ) : null}
          {section === 'fees' ? (
            <View style={styles.content}>
              <FeesScreen embedded />
            </View>
          ) : null}
        </View>
      </SafeAreaView>
    </ScreenDecor>
    </ChildHubRestoreProvider>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { flex: 1 },
  hiddenNotifications: {
    height: 0,
    overflow: 'hidden',
    opacity: 0,
  },
  switcherPanel: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
    borderWidth: 1,
    borderRadius: 14,
    overflow: 'hidden',
  },
  switcherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
});
