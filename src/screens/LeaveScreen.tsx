import { format, parseISO } from 'date-fns';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, useTheme } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import {
  applyStudentLeave,
  cancelStudentLeave,
  getMyStudents,
  getStudentLeaves,
  type ParentLeaveItem,
  type ParentStudent,
} from '../services/parent';
import { useSelectionStore } from '../store/selectionStore';
import { ScreenDecor } from '../components/ScreenDecor';
import { EmptyState } from '../components/EmptyState';
import type { AppTheme } from '../theme';
import { useAppLanguage } from '../common';

const LEAVE_TYPES = ['SICK', 'CASUAL', 'EMERGENCY', 'OTHER'] as const;
const DAY_SESSIONS = ['FULL', 'FIRST_HALF', 'SECOND_HALF'] as const;

type DaySession = (typeof DAY_SESSIONS)[number];

function formatShortDate(value: string | null | undefined): string {
  if (!value) return '—';
  try {
    return format(parseISO(value), 'd MMM yyyy');
  } catch {
    return value;
  }
}

function sessionLabelKey(session: string | null | undefined): string {
  if (session === 'FIRST_HALF') return 'leaves.sessionFirstHalf';
  if (session === 'SECOND_HALF') return 'leaves.sessionSecondHalf';
  return 'leaves.sessionFull';
}

function formatLeaveRange(
  item: {
    fromDate: string;
    toDate: string;
    fromSession?: string | null;
    toSession?: string | null;
  },
  t: (key: any) => string
): string {
  const fromSession = item.fromSession || 'FULL';
  const toSession = item.toSession || 'FULL';
  const fromPart =
    fromSession === 'FULL'
      ? formatShortDate(item.fromDate)
      : `${formatShortDate(item.fromDate)} (${t(sessionLabelKey(fromSession) as any)})`;
  if (item.fromDate === item.toDate && fromSession === toSession) {
    return fromPart;
  }
  if (item.fromDate === item.toDate) {
    return `${formatShortDate(item.fromDate)} (${t(
      sessionLabelKey(fromSession) as any
    )} – ${t(sessionLabelKey(toSession) as any)})`;
  }
  const toPart =
    toSession === 'FULL'
      ? formatShortDate(item.toDate)
      : `${formatShortDate(item.toDate)} (${t(sessionLabelKey(toSession) as any)})`;
  return `${fromPart} – ${toPart}`;
}

function formatReviewedAt(value: string | null | undefined): string {
  if (!value) return '';
  try {
    return format(parseISO(value), 'd MMM yyyy, h:mm a');
  } catch {
    return value;
  }
}

type Props = { embedded?: boolean };

export function LeaveScreen({ embedded = false }: Props) {
  const theme = useTheme() as AppTheme;
  const { t } = useAppLanguage();
  const studentId = useSelectionStore((s) => s.selectedStudentId);

  const [students, setStudents] = useState<ParentStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [items, setItems] = useState<ParentLeaveItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [fromSession, setFromSession] = useState<DaySession>('FULL');
  const [toSession, setToSession] = useState<DaySession>('FULL');
  const [leaveType, setLeaveType] =
    useState<(typeof LEAVE_TYPES)[number]>('SICK');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const selectedStudent = students.find((s) => s.id === studentId) ?? null;

  const load = useCallback(
    async (isRefresh = false) => {
      if (studentId == null) {
        setItems([]);
        setLoading(false);
        return;
      }
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const [studentsRes, leavesRes] = await Promise.all([
          getMyStudents(),
          getStudentLeaves(studentId),
        ]);
        if (studentsRes.status && Array.isArray(studentsRes.data)) {
          setStudents(studentsRes.data);
        }
        if (leavesRes.status && leavesRes.data) {
          setItems(leavesRes.data.leaves || []);
        } else {
          setItems([]);
          setError(leavesRes.message || t('leaves.loadFailed'));
        }
      } catch (e: any) {
        setItems([]);
        setError(e?.message || t('leaves.loadFailed'));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [studentId, t]
  );

  useEffect(() => {
    void load();
  }, [load]);

  const submit = async () => {
    if (studentId == null) return;
    if (!fromDate.trim() || !toDate.trim() || !reason.trim()) {
      Alert.alert('', t('leaves.formRequired'));
      return;
    }
    setSubmitting(true);
    try {
      const res = await applyStudentLeave(studentId, {
        fromDate: fromDate.trim(),
        fromSession,
        toDate: toDate.trim(),
        toSession,
        leaveType,
        reason: reason.trim(),
      });
      if (!res.status) {
        throw new Error(res.message || t('leaves.applyFailed'));
      }
      setShowForm(false);
      setFromDate('');
      setToDate('');
      setFromSession('FULL');
      setToSession('FULL');
      setReason('');
      Alert.alert('', t('leaves.applySuccess'));
      await load(true);
    } catch (e: any) {
      Alert.alert('', e?.message || t('leaves.applyFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const onCancel = (item: ParentLeaveItem) => {
    if (studentId == null) return;
    Alert.alert(t('leaves.cancelTitle'), t('leaves.cancelMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('leaves.cancelLeave'),
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              const res = await cancelStudentLeave(studentId, item.id);
              if (!res.status) {
                throw new Error(res.message || t('leaves.cancelFailed'));
              }
              await load(true);
            } catch (e: any) {
              Alert.alert('', e?.message || t('leaves.cancelFailed'));
            }
          })();
        },
      },
    ]);
  };

  const body = (
    <>
      {selectedStudent ? (
        <Text
          variant="labelLarge"
          style={{
            marginHorizontal: 16,
            marginTop: 8,
            color: theme.colors.onSurfaceVariant,
          }}
        >
          {selectedStudent.name}
        </Text>
      ) : null}

      <View style={styles.toolbar}>
        <Pressable
          onPress={() => setShowForm(true)}
          style={[styles.applyBtn, { backgroundColor: theme.colors.primary }]}
        >
          <MaterialCommunityIcons
            name="plus"
            size={18}
            color={theme.colors.onPrimary}
          />
          <Text
            variant="labelLarge"
            style={{ color: theme.colors.onPrimary, fontWeight: '700' }}
          >
            {t('leaves.apply')}
          </Text>
        </Pressable>
      </View>

      {error ? (
        <Text
          variant="bodyMedium"
          style={{ margin: 16, color: theme.colors.error }}
        >
          {error}
        </Text>
      ) : null}

      <ScrollView
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void load(true)}
            tintColor={theme.colors.primary}
          />
        }
      >
        {items.length === 0 ? (
          <EmptyState
            icon="calendar-remove"
            title={t('leaves.emptyTitle')}
            message={t('leaves.emptyDesc')}
          />
        ) : (
          items.map((item) => (
            <View
              key={item.id}
              style={[
                styles.card,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.outlineVariant,
                },
              ]}
            >
              <View style={styles.cardTop}>
                <Text variant="titleMedium" style={{ fontWeight: '700', flex: 1 }}>
                  {t(`leaves.type${item.leaveType}` as any)}
                </Text>
                <Text variant="labelLarge" style={{ color: theme.colors.primary }}>
                  {item.status}
                </Text>
              </View>
              <Text
                variant="bodySmall"
                style={{ color: theme.colors.onSurfaceVariant }}
              >
                {formatLeaveRange(item, t)}
              </Text>
              <Text variant="bodyMedium">{item.reason}</Text>
              {item.status === 'APPROVED' || item.status === 'REJECTED' ? (
                <Text
                  variant="bodySmall"
                  style={{ color: theme.colors.onSurfaceVariant }}
                >
                  {item.status === 'APPROVED'
                    ? t('leaves.approvedBy')
                    : t('leaves.rejectedBy')}
                  {': '}
                  {[item.reviewedByName, item.reviewedByRoleLabel]
                    .filter(Boolean)
                    .join(' · ') || t('leaves.reviewerUnknown')}
                  {item.reviewedAt
                    ? ` · ${formatReviewedAt(item.reviewedAt)}`
                    : ''}
                </Text>
              ) : null}
              {item.reviewNote ? (
                <Text
                  variant="bodySmall"
                  style={{ color: theme.colors.onSurfaceVariant }}
                >
                  {t('leaves.reviewNote')}: {item.reviewNote}
                </Text>
              ) : null}
              {item.canCancel ? (
                <Pressable onPress={() => onCancel(item)} style={styles.cancelLink}>
                  <Text variant="labelLarge" style={{ color: theme.colors.error }}>
                    {t('leaves.cancelLeave')}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          ))
        )}
      </ScrollView>

      <Modal visible={showForm} animationType="slide" onRequestClose={() => setShowForm(false)}>
        <SafeAreaView
          style={[styles.modalSafe, { backgroundColor: theme.colors.background }]}
        >
          <View style={styles.modalHeader}>
            <Pressable onPress={() => setShowForm(false)} hitSlop={12}>
              <MaterialCommunityIcons
                name="close"
                size={24}
                color={theme.colors.onSurface}
              />
            </Pressable>
            <Text variant="titleMedium" style={{ fontWeight: '700', flex: 1 }}>
              {t('leaves.apply')}
            </Text>
          </View>
          <ScrollView contentContainerStyle={styles.modalContent}>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {t('leaves.dateHint')}
            </Text>
            <TextInput
              value={fromDate}
              onChangeText={setFromDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={theme.colors.onSurfaceVariant}
              style={[
                styles.input,
                {
                  borderColor: theme.colors.outlineVariant,
                  color: theme.colors.onSurface,
                },
              ]}
            />
            <Text
              variant="labelMedium"
              style={{ color: theme.colors.onSurfaceVariant }}
            >
              {t('leaves.fromSession')}
            </Text>
            <View style={styles.typeRow}>
              {DAY_SESSIONS.map((session) => (
                <Pressable
                  key={`from-${session}`}
                  onPress={() => setFromSession(session)}
                  style={[
                    styles.typeChip,
                    {
                      backgroundColor:
                        fromSession === session
                          ? theme.colors.primaryContainer
                          : theme.colors.surface,
                      borderColor: theme.colors.outlineVariant,
                    },
                  ]}
                >
                  <Text variant="labelMedium">
                    {t(sessionLabelKey(session) as any)}
                  </Text>
                </Pressable>
              ))}
            </View>
            <TextInput
              value={toDate}
              onChangeText={setToDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={theme.colors.onSurfaceVariant}
              style={[
                styles.input,
                {
                  borderColor: theme.colors.outlineVariant,
                  color: theme.colors.onSurface,
                },
              ]}
            />
            <Text
              variant="labelMedium"
              style={{ color: theme.colors.onSurfaceVariant }}
            >
              {t('leaves.toSession')}
            </Text>
            <View style={styles.typeRow}>
              {DAY_SESSIONS.map((session) => (
                <Pressable
                  key={`to-${session}`}
                  onPress={() => setToSession(session)}
                  style={[
                    styles.typeChip,
                    {
                      backgroundColor:
                        toSession === session
                          ? theme.colors.primaryContainer
                          : theme.colors.surface,
                      borderColor: theme.colors.outlineVariant,
                    },
                  ]}
                >
                  <Text variant="labelMedium">
                    {t(sessionLabelKey(session) as any)}
                  </Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.typeRow}>
              {LEAVE_TYPES.map((type) => (
                <Pressable
                  key={type}
                  onPress={() => setLeaveType(type)}
                  style={[
                    styles.typeChip,
                    {
                      backgroundColor:
                        leaveType === type
                          ? theme.colors.primaryContainer
                          : theme.colors.surface,
                      borderColor: theme.colors.outlineVariant,
                    },
                  ]}
                >
                  <Text variant="labelMedium">
                    {t(`leaves.type${type}` as any)}
                  </Text>
                </Pressable>
              ))}
            </View>
            <TextInput
              value={reason}
              onChangeText={setReason}
              placeholder={t('leaves.reasonPlaceholder')}
              placeholderTextColor={theme.colors.onSurfaceVariant}
              multiline
              style={[
                styles.input,
                styles.reason,
                {
                  borderColor: theme.colors.outlineVariant,
                  color: theme.colors.onSurface,
                },
              ]}
            />
            <Pressable
              onPress={() => void submit()}
              disabled={submitting}
              style={[
                styles.submitBtn,
                {
                  backgroundColor: theme.colors.primary,
                  opacity: submitting ? 0.7 : 1,
                },
              ]}
            >
              {submitting ? (
                <ActivityIndicator color={theme.colors.onPrimary} />
              ) : (
                <Text
                  variant="labelLarge"
                  style={{ color: theme.colors.onPrimary, fontWeight: '700' }}
                >
                  {t('leaves.submit')}
                </Text>
              )}
            </Pressable>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </>
  );

  if (loading) {
    const loader = (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
    if (embedded) return <View style={styles.embedded}>{loader}</View>;
    return (
      <ScreenDecor>
        <SafeAreaView style={styles.safe} edges={['top']}>
          {loader}
        </SafeAreaView>
      </ScreenDecor>
    );
  }

  if (embedded) return <View style={styles.embedded}>{body}</View>;

  return (
    <ScreenDecor>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Text
          variant="headlineSmall"
          style={{ fontWeight: '700', marginHorizontal: 16, marginTop: 8 }}
        >
          {t('leaves.title')}
        </Text>
        {body}
      </SafeAreaView>
    </ScreenDecor>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  embedded: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  toolbar: { paddingHorizontal: 16, paddingTop: 12 },
  applyBtn: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  list: { padding: 16, gap: 12, paddingBottom: 40 },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    padding: 14,
    gap: 6,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cancelLink: { marginTop: 4 },
  modalSafe: { flex: 1 },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  modalContent: { padding: 16, gap: 12 },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  reason: { minHeight: 90, textAlignVertical: 'top' },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeChip: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  submitBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
});
