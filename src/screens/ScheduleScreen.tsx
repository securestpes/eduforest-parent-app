import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, useTheme } from 'react-native-paper';
import { getMyStudents, getStudentSchedules, type ParentSchedule, type ParentStudent } from '../services/parent';
import { useSelectionStore } from '../store/selectionStore';
import { ScreenDecor } from '../components/ScreenDecor';
import { EmptyState } from '../components/EmptyState';
import { ScheduleSection } from '../components/ScheduleSection';
import { TodayHeroCard } from '../components/TodayHeroCard';
import { getStudentAttendance, type ParentAttendanceRow } from '../services/parent';
import type { AppTheme } from '../../theme';
import { useAppLanguage } from '../../common';

export function ScheduleScreen({ embedded }: { embedded?: boolean } = {}) {
  const theme = useTheme() as AppTheme;
  const { t } = useAppLanguage();
  const studentId = useSelectionStore((s) => s.selectedStudentId);

  const [student, setStudent] = useState<ParentStudent | null>(null);
  const [schedules, setSchedules] = useState<ParentSchedule[]>([]);
  const [rows, setRows] = useState<ParentAttendanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!studentId) {
      setStudent(null);
      setSchedules([]);
      setRows([]);
      setLoading(false);
      return;
    }
    try {
      const [stRes, schRes, attRes] = await Promise.all([
        getMyStudents(),
        getStudentSchedules(studentId),
        getStudentAttendance(studentId, 0, 10),
      ]);
      if (stRes.status && Array.isArray(stRes.data)) {
        setStudent(stRes.data.find((s) => s.id === studentId) ?? null);
      }
      if (schRes.status && Array.isArray(schRes.data)) setSchedules(schRes.data);
      else setSchedules([]);
      if (attRes.status && attRes.data?.content) setRows(attRes.data.content);
      else setRows([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [studentId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!studentId) {
    if (embedded) return null;
    return (
      <ScreenDecor>
        <SafeAreaView style={styles.safe} edges={['top']}>
          <EmptyState
            icon="gesture-tap"
            title={t('attendance.pickStudentTitle')}
            message={t('attendance.pickStudentMessage')}
          />
        </SafeAreaView>
      </ScreenDecor>
    );
  }

  const body = (
    <ScrollView
      contentContainerStyle={styles.scroll}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            void load();
          }}
          tintColor={theme.colors.primary}
        />
      }
    >
      {loading ? (
        <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <>
          {!embedded ? (
            <Text variant="headlineSmall" style={{ color: theme.colors.onBackground, fontWeight: '800', marginTop: 8 }}>
              {student?.name ?? t('common.student')}
            </Text>
          ) : null}
          <TodayHeroCard student={student} schedules={schedules} rows={rows} />
          <ScheduleSection schedules={schedules} />
        </>
      )}
    </ScrollView>
  );

  if (embedded) {
    return <View style={styles.embedded}>{body}</View>;
  }

  return (
    <ScreenDecor>
      <SafeAreaView style={styles.safe} edges={['top']}>
        {body}
      </SafeAreaView>
    </ScreenDecor>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  embedded: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingBottom: 36 },
});
