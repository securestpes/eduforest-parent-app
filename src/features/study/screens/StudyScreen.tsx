import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../../../theme/appTheme';
import { ChildHeroHeader, type ChildHeaderTab } from '../../../components/layout/ChildHeroHeader';
import { openNotificationCenter } from '../../../services/openNotificationCenter';
import { HomeworkPanel } from '../../homework/components/HomeworkPanel';
import { useStudentHomework } from '../../homework/hooks/useStudentHomework';
import { AttendanceScreen } from '../../../screens/AttendanceScreen';
import { ExamResultsScreen } from '../../../screens/ExamResultsScreen';
import { ProfileScreen } from '../../../screens/ProfileScreen';
import { ChildDashboard } from '../../../screens/ChildDashboard';
import { useSelectionStore } from '../../../store/selectionStore';
import type { ChildChipAction } from '../../../components/ChildActionChips';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import type { RootStackParamList } from '../../../navigation/Navigation';

export function StudyScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const [tab, setTab] = useState<ChildHeaderTab>('homework');
  const { student, className, sectionName, classLabel } = useStudentHomework();
  const setSelected = useSelectionStore((s) => s.setSelectedStudentId);

  const fallbackMeta = student?.batchNames?.length ? student.batchNames.join(' • ') : null;

  const openModule = (action: ChildChipAction) => {
    if (!student) return;
    setSelected(student.id);
    if (action === 'bus') {
      navigation.navigate('BusTrackingMap', { studentId: student.id });
      return;
    }
    navigation.navigate('ChildHub', { studentId: student.id, section: action });
  };

  return (
    <View style={styles.root}>
      <ChildHeroHeader
        name={student?.name ?? 'Your child'}
        className={className}
        sectionName={sectionName}
        fallbackMeta={classLabel || fallbackMeta}
        activeTab={tab}
        onTabChange={setTab}
        onBellPress={() => void openNotificationCenter()}
      />

      <View style={styles.body}>
        {tab === 'homework' ? <HomeworkPanel /> : null}
        {tab === 'academics' ? <ExamResultsScreen embedded /> : null}
        {tab === 'attendance' ? <AttendanceScreen embedded /> : null}
        {tab === 'more' ? <ProfileScreen /> : null}
        {tab === 'dashboard' && student ? (
          <ChildDashboard
            student={student}
            siblings={[]}
            onChangeChild={setSelected}
            onOpenModule={openModule}
          />
        ) : null}
        {tab === 'dashboard' && !student ? (
          <View style={{ padding: 24 }}>
            <Text style={{ color: colors.textSecondary }}>Select a child on Home first.</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  body: { flex: 1 },
});
