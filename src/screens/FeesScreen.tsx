import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, useTheme } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import {
  getMyStudents,
  getStudentFeeReceipt,
  getStudentFees,
  type ParentFeeInstallment,
  type ParentFeeLedger,
  type ParentStudent,
} from '../services/parent';
import { useSelectionStore } from '../store/selectionStore';
import { ScreenDecor } from '../components/ScreenDecor';
import { EmptyState } from '../components/EmptyState';
import type { AppTheme } from '../theme';
import { useAppLanguage } from '../common';
import {
  formatDueBreakdown,
  installmentHeadBreakdown,
  ledgerDueBreakdown,
} from '../utils/feeDueBreakdown';

type Props = { embedded?: boolean };

function statusColor(status: string, theme: AppTheme): string {
  const s = (status || '').toUpperCase();
  if (s === 'PAID') return theme.colors.success;
  if (s === 'OVERDUE') return theme.colors.error;
  if (s === 'PARTIAL') return theme.colors.warning;
  return theme.colors.primary;
}

function feeStatusLabel(
  status: string,
  t: (key: any, params?: Record<string, string | number>) => string
): string {
  const s = (status || '').toUpperCase();
  if (s === 'PAID' || s === 'COLLECTED') return t('fees.statusPaid');
  if (s === 'PARTIAL') return t('fees.statusPartial');
  if (s === 'OVERDUE') return t('fees.statusOverdue');
  if (s === 'WAIVED') return t('fees.statusWaived');
  if (s.includes('FUTURE')) return t('fees.statusFutureDue');
  if (s === 'DUE' || s === 'OPEN') return t('fees.statusDue');
  return status || t('fees.statusDue');
}

export function FeesScreen({ embedded = false }: Props) {
  const theme = useTheme() as AppTheme;
  const { t } = useAppLanguage();
  const studentId = useSelectionStore((s) => s.selectedStudentId);

  const [students, setStudents] = useState<ParentStudent[]>([]);
  const [ledger, setLedger] = useState<ParentFeeLedger | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<ParentFeeInstallment | null>(null);
  const [receiptText, setReceiptText] = useState<string | null>(null);

  const selectedStudent = students.find((s) => s.id === studentId) ?? null;

  const dueBreakdown = useMemo(
    () => ledgerDueBreakdown(ledger),
    [ledger]
  );

  const load = useCallback(
    async (isRefresh = false) => {
      if (studentId == null) {
        setLedger(null);
        setLoading(false);
        return;
      }
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const [stRes, feeRes] = await Promise.all([
          getMyStudents(),
          getStudentFees(studentId),
        ]);
        if (stRes.status && Array.isArray(stRes.data)) setStudents(stRes.data);
        if (!feeRes.status || !feeRes.data) {
          setError(feeRes.message || t('fees.loadFailed'));
          setLedger(null);
          return;
        }
        setLedger(feeRes.data);
      } catch (e: any) {
        setError(e?.message || t('fees.loadFailed'));
        setLedger(null);
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

  const openReceipt = async (receiptId: number) => {
    if (studentId == null) return;
    try {
      const res = await getStudentFeeReceipt(studentId, receiptId);
      if (res.status && res.data) {
        const d = res.data;
        setReceiptText(
          [
            `Receipt ${d.receiptNo ?? ''}`,
            `Amount ₹${Number(d.amount ?? 0).toFixed(2)}`,
            `Mode ${d.paymentMode ?? ''}`,
            d.paidAt ? `Paid ${String(d.paidAt).slice(0, 16)}` : '',
            d.referenceNo ? `Ref ${d.referenceNo}` : '',
          ]
            .filter(Boolean)
            .join('\n')
        );
      }
    } catch (e: any) {
      setReceiptText(e?.message || t('fees.loadFailed'));
    }
  };

  if (studentId == null) {
    if (embedded) return null;
    return (
      <ScreenDecor>
        <SafeAreaView style={styles.safe} edges={['top']}>
          <EmptyState
            icon="gesture-tap"
            title={t('fees.pickStudentTitle')}
            message={t('fees.pickStudentMessage')}
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
          onRefresh={() => void load(true)}
          tintColor={theme.colors.primary}
        />
      }
    >
      {!embedded ? (
        <Text
          variant="headlineSmall"
          style={{ color: theme.colors.onSurface, fontWeight: '700' }}
        >
          {t('fees.title')}
        </Text>
      ) : null}
      {selectedStudent ? (
        <Text
          variant="bodyMedium"
          style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}
        >
          {selectedStudent.name}
          {ledger?.sessionName ? ` · ${ledger.sessionName}` : ''}
        </Text>
      ) : null}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : error ? (
        <EmptyState
          icon="alert-circle-outline"
          title={t('fees.loadFailed')}
          message={error}
        />
      ) : !ledger || (!ledger.hasAssignment && !(ledger.installments?.length > 0)) ? (
        <EmptyState
          icon="currency-inr"
          title={t('fees.emptyTitle')}
          message={t('fees.emptyMessage')}
        />
      ) : (
        <>
          <View
            style={[
              styles.summary,
              {
                backgroundColor: theme.colors.primaryContainer,
                borderColor: theme.colors.outlineVariant,
              },
            ]}
          >
            <View style={styles.summaryCol}>
              <Text variant="labelMedium" style={{ color: theme.colors.primary }}>
                {t('fees.due')}
              </Text>
              <Text
                variant="titleLarge"
                style={{ color: theme.colors.primary, fontWeight: '800' }}
              >
                ₹{Number(ledger.totalDue || 0).toFixed(0)}
              </Text>
            </View>
            <View style={styles.summaryCol}>
              <Text
                variant="labelMedium"
                style={{ color: theme.colors.onSurfaceVariant }}
              >
                {t('fees.paid')}
              </Text>
              <Text
                variant="titleLarge"
                style={{ color: theme.colors.onSurface, fontWeight: '800' }}
              >
                ₹{Number(ledger.totalPaid || 0).toFixed(0)}
              </Text>
            </View>
            <View style={styles.summaryCol}>
              <Text
                variant="labelMedium"
                style={{ color: theme.colors.onSurfaceVariant }}
              >
                {t('fees.nextDue')}
              </Text>
              <Text
                variant="titleSmall"
                style={{ color: theme.colors.onSurface, fontWeight: '700' }}
              >
                {ledger.nextDueDate || '—'}
              </Text>
            </View>
          </View>

          {dueBreakdown.length > 1 ? (
            <Text
              variant="bodySmall"
              style={{
                color: theme.colors.onSurfaceVariant,
                marginTop: 10,
                lineHeight: 18,
              }}
            >
              {formatDueBreakdown(dueBreakdown, true)}
            </Text>
          ) : null}

          <Text
            variant="titleSmall"
            style={{
              color: theme.colors.onSurface,
              fontWeight: '700',
              marginTop: 18,
              marginBottom: 8,
            }}
          >
            {t('fees.months')}
          </Text>

          {(ledger.installments || []).map((inst) => {
            const monthBreakdown = installmentHeadBreakdown(inst.heads, true);
            return (
            <Pressable
              key={inst.key}
              onPress={() => setSelected(inst)}
              style={[
                styles.monthCard,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.outlineVariant,
                },
              ]}
            >
              <View style={{ flex: 1 }}>
                <Text
                  variant="titleMedium"
                  style={{ color: theme.colors.onSurface, fontWeight: '700' }}
                >
                  {inst.label}
                </Text>
                <Text
                  variant="bodySmall"
                  style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}
                >
                  {t('fees.dueOn', { date: inst.dueDate })} · ₹
                  {Number(inst.amount).toFixed(0)}
                </Text>
                {monthBreakdown ? (
                  <Text
                    variant="bodySmall"
                    style={{
                      color: theme.colors.primary,
                      marginTop: 4,
                      fontWeight: '600',
                    }}
                  >
                    {monthBreakdown}
                  </Text>
                ) : null}
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text
                  variant="labelLarge"
                  style={{
                    color: statusColor(inst.status, theme),
                    fontWeight: '800',
                  }}
                >
                  {feeStatusLabel(inst.status, t)}
                </Text>
                <Text
                  variant="bodySmall"
                  style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}
                >
                  {Number(inst.balance) > 0
                    ? `${t('fees.balance')} ₹${Number(inst.balance).toFixed(0)}`
                    : t('fees.paidAmount', {
                        amount: Number(inst.paidAmount).toFixed(0),
                      })}
                </Text>
                {inst.collectedDate ? (
                  <Text
                    variant="bodySmall"
                    style={{
                      color: theme.colors.onSurfaceVariant,
                      marginTop: 2,
                    }}
                  >
                    {inst.collectedDate}
                    {inst.lastPaymentMode ? ` · ${inst.lastPaymentMode}` : ''}
                  </Text>
                ) : null}
              </View>
            </Pressable>
            );
          })}

          {(ledger.payments || []).length > 0 ? (
            <>
              <Text
                variant="titleSmall"
                style={{
                  color: theme.colors.onSurface,
                  fontWeight: '700',
                  marginTop: 18,
                  marginBottom: 8,
                }}
              >
                {t('fees.payments')}
              </Text>
              {ledger.payments.map((p) => (
                <Pressable
                  key={p.paymentId}
                  onPress={() =>
                    p.receiptId != null ? void openReceipt(p.receiptId) : null
                  }
                  style={[
                    styles.monthCard,
                    {
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.outlineVariant,
                    },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      variant="titleSmall"
                      style={{ color: theme.colors.onSurface, fontWeight: '700' }}
                    >
                      {p.receiptNo || `#${p.paymentId}`} · ₹
                      {Number(p.amount).toFixed(0)}
                    </Text>
                    <Text
                      variant="bodySmall"
                      style={{
                        color: theme.colors.onSurfaceVariant,
                        marginTop: 4,
                      }}
                    >
                      {p.paymentMode} · {p.paidAt?.slice(0, 10)}
                    </Text>
                  </View>
                  <MaterialCommunityIcons
                    name="chevron-right"
                    size={22}
                    color={theme.colors.onSurfaceVariant}
                  />
                </Pressable>
              ))}
            </>
          ) : null}
        </>
      )}

      <Modal visible={!!selected} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalCard,
              { backgroundColor: theme.colors.surface },
            ]}
          >
            <Text
              variant="titleLarge"
              style={{ color: theme.colors.onSurface, fontWeight: '700' }}
            >
              {selected?.label}
            </Text>
            <Text
              variant="bodyMedium"
              style={{ color: theme.colors.onSurfaceVariant, marginTop: 6 }}
            >
              {feeStatusLabel(selected?.status || '', t)} ·{' '}
              {t('fees.dueOn', { date: selected?.dueDate || '' })}
            </Text>
            {(selected?.heads || []).map((h) => (
              <View key={h.demandId} style={styles.headRow}>
                <Text
                  style={{ color: theme.colors.onSurface, fontWeight: '600', flex: 1 }}
                >
                  {h.feeHeadName}
                </Text>
                <Text style={{ color: theme.colors.onSurfaceVariant }}>
                  ₹{Number(h.paidAmount).toFixed(0)} / ₹
                  {Number(h.amount).toFixed(0)}
                </Text>
              </View>
            ))}
            <Pressable
              onPress={() => setSelected(null)}
              style={[
                styles.closeBtn,
                { backgroundColor: theme.colors.primary },
              ]}
            >
              <Text style={{ color: theme.colors.onPrimary, fontWeight: '700' }}>
                {t('common.close') || 'Close'}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={!!receiptText} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalCard,
              { backgroundColor: theme.colors.surface },
            ]}
          >
            <Text
              variant="titleMedium"
              style={{ color: theme.colors.onSurface, fontWeight: '700' }}
            >
              {t('fees.receipt')}
            </Text>
            <Text
              style={{
                color: theme.colors.onSurface,
                marginTop: 12,
                lineHeight: 22,
              }}
            >
              {receiptText}
            </Text>
            <Pressable
              onPress={() => setReceiptText(null)}
              style={[
                styles.closeBtn,
                { backgroundColor: theme.colors.primary },
              ]}
            >
              <Text style={{ color: theme.colors.onPrimary, fontWeight: '700' }}>
                {t('common.close') || 'Close'}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );

  if (embedded) return <View style={styles.flex}>{body}</View>;
  return (
    <ScreenDecor>
      <SafeAreaView style={styles.safe} edges={['top']}>
        {body}
      </SafeAreaView>
    </ScreenDecor>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safe: { flex: 1 },
  scroll: { padding: 16, paddingBottom: 40 },
  center: { paddingVertical: 48, alignItems: 'center' },
  summary: {
    marginTop: 14,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  summaryCol: { flex: 1 },
  monthCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 32,
  },
  headRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ddd',
  },
  closeBtn: {
    marginTop: 18,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
});
