import { format, parseISO } from 'date-fns';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import {
  getMyStudents,
  getStudentFeeReceipt,
  getStudentFeeReceiptPdf,
  getStudentFees,
  type ParentFeeLedger,
  type ParentFeePayment,
  type ParentStudent,
} from '../services/parent';
import { useSelectionStore } from '../store/selectionStore';
import { ScreenDecor } from '../components/ScreenDecor';
import { EmptyState } from '../components/EmptyState';
import { StudentModuleHero } from '../components/layout/StudentModuleHero';
import { colors, shadows, spacing } from '../theme/appTheme';
import { useAppLanguage, type TranslationKey } from '../common';
import { formatInr } from '../features/home/utils/homeMetrics';
import { navigateToTab } from '../navigation/navigationRef';
import { savePdfToDevice } from '../utils/savePdfToDevice';
import { formatLocalDateTime, parsePushTimestamp } from '../utils/localDateTime';
import { payableFeeSummary, overviewFeeItems, historyMonthGroups, type HistoryMonthGroup, type OverviewFeeItem } from '../utils/feeDueBreakdown';

type Props = { embedded?: boolean };
type FeesTab = 'due' | 'history' | 'receipts';
type HistoryFilter = 'all' | 'month' | 'year' | 'custom';

type FeeTableRow = {
  id: string;
  title: string;
  subtitle: string;
  monthTitle: string;
  sortKey: number;
  amount: number;
  status: string;
  receiptId?: number;
};

type FeeTableGroup = {
  key: string;
  title: string;
  rows: FeeTableRow[];
};

function formatReceiptPaidAt(paidAt?: unknown): string {
  if (!paidAt) return '';
  const iso = String(paidAt).trim();
  const hasOffset = /[zZ]$/.test(iso) || /[+-]\d{2}:\d{2}$/.test(iso);
  if (hasOffset) {
    const parsed = parsePushTimestamp(iso);
    return parsed ? formatLocalDateTime(parsed) : iso.replace('T', ' ').slice(0, 16);
  }
  return iso.replace('T', ' ').slice(0, 16);
}

function formatParentReceipt(
  d: Record<string, unknown>,
  t: (key: TranslationKey, params?: Record<string, string | number>) => string
): string {
  const lines: string[] = [];
  const school = String(d.instituteName || '').trim();
  if (school) lines.push(school);
  lines.push(`${t('fees.receipt')} ${d.receiptNo ?? ''}`.trim());
  if (d.studentName) lines.push(String(d.studentName));
  if (d.className) lines.push(String(d.className));
  const paidAt = formatReceiptPaidAt(d.paidAt);
  if (paidAt) lines.push(paidAt);
  if (d.paymentMode) lines.push(String(d.paymentMode));
  if (d.referenceNo) lines.push(`Ref ${d.referenceNo}`);
  lines.push(`₹${Number(d.amount ?? 0).toFixed(2)}`);
  if (Number(d.concessionAmount ?? 0) > 0) {
    lines.push(
      t('fees.concessionLine', {
        amount: Number(d.concessionAmount).toFixed(2),
      })
    );
  }
  if (d.collectedByName) {
    lines.push(t('fees.collectedBy', { name: String(d.collectedByName) }));
  }
  const allocations = Array.isArray(d.allocations) ? d.allocations : [];
  for (const row of allocations) {
    const item = row as Record<string, unknown>;
    const label = [item.label, item.feeHeadName].filter(Boolean).join(' · ');
    if (label) {
      lines.push(`${label}  ₹${Number(item.amount ?? 0).toFixed(2)}`);
    }
  }
  return lines.filter(Boolean).join('\n');
}

function statusKey(status: string): string {
  return (status || '').toUpperCase();
}

function feeStatusLabel(
  status: string,
  t: (key: TranslationKey, params?: Record<string, string | number>) => string
): string {
  const s = statusKey(status);
  if (s === 'PAID' || s === 'COLLECTED') return t('fees.badgePaid');
  if (s === 'PARTIAL') return t('fees.statusPartial');
  if (s === 'OVERDUE') return t('fees.statusOverdue');
  if (s === 'WAIVED') return t('fees.statusWaived');
  if (s.includes('FUTURE')) return t('fees.statusFutureDue');
  if (s === 'DUE' || s === 'OPEN') return t('fees.statusDue');
  return status || t('fees.statusDue');
}

function feeHeadVisual(name: string): {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  bg: string;
  fg: string;
} {
  const n = name.toLowerCase();
  if (n.includes('transport') || n.includes('bus')) {
    return { icon: 'bus', bg: '#FDE8EE', fg: '#E11D48' };
  }
  if (n.includes('exam')) {
    return { icon: 'card-account-details-outline', bg: '#FFF1E6', fg: '#EA580C' };
  }
  if (n.includes('activit') || n.includes('sport')) {
    return { icon: 'clipboard-text-outline', bg: '#E8F8EF', fg: '#059669' };
  }
  if (n.includes('tuit') || n.includes('receipt')) {
    return { icon: 'file-document-outline', bg: '#EEEBFE', fg: '#6B5CE7' };
  }
  return { icon: 'cash', bg: '#E8F0FE', fg: '#2563EB' };
}

function badgeTone(status: string): { bg: string; fg: string } {
  const s = statusKey(status);
  if (s === 'PAID' || s === 'COLLECTED' || s === 'WAIVED') {
    return { bg: '#D8F5E3', fg: '#059669' };
  }
  if (s === 'OVERDUE') return { bg: colors.dangerSoft, fg: colors.danger };
  if (s === 'PARTIAL') return { bg: colors.warningSoft, fg: '#B45309' };
  return { bg: colors.primarySoft, fg: colors.primary };
}

function groupRows(rows: FeeTableRow[]): FeeTableGroup[] {
  const map = new Map<string, FeeTableGroup>();
  const sorted = [...rows].sort((a, b) => a.sortKey - b.sortKey);
  for (const row of sorted) {
    const existing = map.get(row.monthTitle);
    if (existing) existing.rows.push(row);
    else map.set(row.monthTitle, { key: row.monthTitle, title: row.monthTitle, rows: [row] });
  }
  return Array.from(map.values());
}

function formatFeeDueDate(value?: string | null): string {
  if (!value) return '';
  try {
    const parsed = parseISO(value.length <= 10 ? `${value}T00:00:00` : value);
    if (Number.isNaN(parsed.getTime())) return value;
    return format(parsed, 'd MMM yyyy');
  } catch {
    return value;
  }
}

function FeesSummaryCard({ ledger }: { ledger: ParentFeeLedger | null }) {
  const { t } = useAppLanguage();
  const summary = payableFeeSummary(ledger);

  return (
    <View style={styles.summaryCard}>
      <Text style={styles.summaryTitle}>{t('fees.outstandingSummary')}</Text>
      <View style={styles.summarySplit}>
        <View style={styles.summaryTotal}>
          <Text style={styles.summaryKicker}>{t('fees.totalOutstanding')}</Text>
          <Text style={[styles.summaryHeroAmount, { color: colors.primary }]}>
            {formatInr(summary.pending)}
          </Text>
        </View>
        <View style={styles.summarySide}>
          <View style={styles.summarySideRow}>
            <Text style={styles.summaryKicker}>{t('fees.sectionOverdue')}</Text>
            <Text style={[styles.summarySideAmount, { color: colors.danger }]}>
              {formatInr(summary.overdue)}
            </Text>
          </View>
          <View style={styles.summarySideRow}>
            <Text style={styles.summaryKicker}>{t('fees.sectionDueThisMonth')}</Text>
            <Text style={[styles.summarySideAmount, { color: '#B45309' }]}>
              {formatInr(summary.dueThisMonth)}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

function OverviewItemCard({ item }: { item: OverviewFeeItem }) {
  const { t } = useAppLanguage();
  const visual = feeHeadVisual(item.title);
  const overdue = item.kind === 'overdue';
  const dateLabel = formatFeeDueDate(item.dueDate);
  const note = dateLabel
    ? overdue
      ? t('fees.overdueSince', { date: dateLabel })
      : t('fees.dueBy', { date: dateLabel })
    : overdue
      ? t('fees.statusOverdue')
      : t('fees.statusDue');

  return (
    <View style={styles.overviewCard}>
      <View style={[styles.rowIcon, { backgroundColor: overdue ? colors.dangerSoft : visual.bg }]}>
        <MaterialCommunityIcons
          name={visual.icon}
          size={20}
          color={overdue ? colors.danger : visual.fg}
        />
      </View>
      <View style={styles.rowCopy}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.rowSub} numberOfLines={1}>
          {item.monthLabel}
        </Text>
        <Text
          style={[styles.overviewNote, { color: overdue ? colors.danger : '#B45309' }]}
          numberOfLines={1}
        >
          {note}
        </Text>
      </View>
      <Text style={styles.rowAmount}>{formatInr(item.amount)}</Text>
    </View>
  );
}

function FeesHelpBanner() {
  const { t } = useAppLanguage();
  return (
    <View style={styles.helpCard}>
      <MaterialCommunityIcons name="shield-check" size={28} color={colors.primary} />
      <Text style={styles.helpText}>{t('fees.helpContact')}</Text>
    </View>
  );
}

function OverviewPanel({ ledger }: { ledger: ParentFeeLedger | null }) {
  const { t } = useAppLanguage();
  const { overdue, dueThisMonth } = overviewFeeItems(ledger);

  if (!overdue.length && !dueThisMonth.length) {
    return (
      <View>
        <EmptyState
          icon="check-circle-outline"
          title={t('fees.emptyDueTitle')}
          message={t('fees.emptyDueMessage')}
        />
        <FeesHelpBanner />
      </View>
    );
  }

  const sections: { key: 'overdue' | 'due'; title: string; color: string; items: OverviewFeeItem[] }[] = [
    {
      key: 'overdue',
      title: t('fees.sectionOverdue'),
      color: colors.danger,
      items: overdue,
    },
    {
      key: 'due',
      title: t('fees.sectionDueThisMonth'),
      color: '#B45309',
      items: dueThisMonth,
    },
  ];

  return (
    <View>
      {sections.map((section) =>
        section.items.length ? (
          <View key={section.key} style={styles.group}>
            <View style={styles.sectionHead}>
              <Text style={[styles.groupTitle, { color: section.color, marginBottom: 0 }]}>
                {section.title}
              </Text>
              <View style={[styles.countPill, { backgroundColor: `${section.color}22` }]}>
                <Text style={[styles.countPillText, { color: section.color }]}>
                  {section.items.length === 1
                    ? t('fees.itemCount', { count: 1 })
                    : t('fees.itemsCount', { count: section.items.length })}
                </Text>
              </View>
            </View>
            {section.items.map((item) => (
              <OverviewItemCard key={item.id} item={item} />
            ))}
          </View>
        ) : null
      )}
      <FeesHelpBanner />
    </View>
  );
}

function HistoryPanel({ groups }: { groups: HistoryMonthGroup[] }) {
  const { t } = useAppLanguage();
  const [filter, setFilter] = useState<HistoryFilter>('all');
  const [customKey, setCustomKey] = useState<string | null>(null);
  const [customOpen, setCustomOpen] = useState(false);
  const [openKeys, setOpenKeys] = useState<Record<string, boolean>>({});

  const now = new Date();
  const filtered = groups.filter((g) => {
    const d = new Date(Math.floor(g.sortKey / 12), g.sortKey % 12, 1);
    if (filter === 'month') {
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    }
    if (filter === 'year') return d.getFullYear() === now.getFullYear();
    if (filter === 'custom') return customKey ? g.key === customKey : true;
    return true;
  });

  const chips: { id: HistoryFilter; label: string }[] = [
    { id: 'all', label: t('fees.filterAll') },
    { id: 'month', label: t('fees.filterThisMonth') },
    { id: 'year', label: t('fees.filterThisYear') },
    { id: 'custom', label: t('fees.filterCustom') },
  ];

  if (!groups.length) {
    return (
      <EmptyState
        icon="history"
        title={t('fees.emptyHistoryTitle')}
        message={t('fees.emptyHistoryMessage')}
      />
    );
  }

  return (
    <View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
      >
        {chips.map((chip) => {
          const active = filter === chip.id;
          return (
            <Pressable
              key={chip.id}
              onPress={() => {
                if (chip.id === 'custom') {
                  setFilter('custom');
                  setCustomOpen(true);
                  return;
                }
                setFilter(chip.id);
              }}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{chip.label}</Text>
              {chip.id === 'custom' ? (
                <MaterialCommunityIcons
                  name="calendar-month-outline"
                  size={14}
                  color={active ? colors.headerOn : colors.textSecondary}
                />
              ) : null}
            </Pressable>
          );
        })}
      </ScrollView>

      {filtered.length === 0 ? (
        <EmptyState
          icon="history"
          title={t('fees.emptyHistoryTitle')}
          message={t('fees.emptyHistoryMessage')}
        />
      ) : (
        filtered.map((group) => {
          const expanded = openKeys[group.key] ?? group.status !== 'paid';
          const tone =
            group.status === 'overdue'
              ? badgeTone('OVERDUE')
              : group.status === 'due'
                ? badgeTone('DUE')
                : badgeTone('PAID');
          return (
            <View key={group.key} style={styles.historyCard}>
              <Pressable
                onPress={() =>
                  setOpenKeys((prev) => ({
                    ...prev,
                    [group.key]: !expanded,
                  }))
                }
                style={styles.historyHead}
              >
                <Text style={styles.historyMonth}>{group.title}</Text>
                <View style={[styles.statusPill, { backgroundColor: tone.bg }]}>
                  <Text style={[styles.statusPillText, { color: tone.fg }]}>
                    {feeStatusLabel(group.status === 'paid' ? 'PAID' : group.status === 'overdue' ? 'OVERDUE' : 'DUE', t)}
                  </Text>
                </View>
                <MaterialCommunityIcons
                  name={expanded ? 'chevron-up' : 'chevron-down'}
                  size={22}
                  color={colors.textSecondary}
                />
              </Pressable>
              {expanded ? (
                <View style={styles.historyBody}>
                  {group.items.map((item, index) => {
                    const visual = feeHeadVisual(item.title);
                    return (
                      <View
                        key={`${group.key}-${item.title}-${index}`}
                        style={[
                          styles.historyRow,
                          index < group.items.length - 1 && styles.tableRowBorder,
                        ]}
                      >
                        <View style={[styles.rowIcon, { backgroundColor: visual.bg }]}>
                          <MaterialCommunityIcons name={visual.icon} size={20} color={visual.fg} />
                        </View>
                        <View style={styles.rowCopy}>
                          <Text style={styles.rowTitle}>{item.title}</Text>
                          {item.paidOn ? (
                            <Text style={[styles.rowSub, { color: colors.success }]}>
                              {t('fees.paidOn', { date: formatFeeDueDate(item.paidOn) || item.paidOn })}
                            </Text>
                          ) : null}
                        </View>
                        <Text style={styles.rowAmount}>{formatInr(item.amount)}</Text>
                      </View>
                    );
                  })}
                  <View style={styles.totalPaidRow}>
                    <Text style={styles.totalPaidLabel}>{t('fees.totalPaid')}</Text>
                    <Text style={styles.totalPaidValue}>{formatInr(group.totalPaid)}</Text>
                  </View>
                </View>
              ) : null}
            </View>
          );
        })
      )}

      <Modal visible={customOpen} transparent animationType="fade">
        <Pressable style={styles.modalBackdrop} onPress={() => setCustomOpen(false)}>
          <Pressable style={styles.monthPicker} onPress={() => undefined}>
            <Text style={styles.modalTitle}>{t('fees.filterCustom')}</Text>
            <ScrollView style={{ maxHeight: 320 }}>
              {groups.map((g) => (
                <Pressable
                  key={g.key}
                  style={styles.monthPickRow}
                  onPress={() => {
                    setCustomKey(g.key);
                    setFilter('custom');
                    setCustomOpen(false);
                  }}
                >
                  <Text
                    style={{
                      color: colors.text,
                      fontWeight: customKey === g.key ? '700' : '500',
                    }}
                  >
                    {g.title}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function FeesTable({
  groups,
  emptyIcon,
  emptyTitle,
  emptyMessage,
  downloadingId,
  onDownload,
  statusLabel,
}: {
  groups: FeeTableGroup[];
  emptyIcon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  emptyTitle: string;
  emptyMessage: string;
  downloadingId?: string | null;
  onDownload?: (row: FeeTableRow) => void;
  statusLabel: (status: string) => string;
}) {
  const { t } = useAppLanguage();
  if (!groups.length) {
    return (
      <EmptyState icon={emptyIcon} title={emptyTitle} message={emptyMessage} />
    );
  }

  return (
    <View>
      {groups.map((group) => (
        <View key={group.key} style={styles.group}>
          <Text style={styles.groupTitle}>{group.title}</Text>
          <View style={styles.tableCard}>
            {group.rows.map((row, index) => {
              const visual = feeHeadVisual(row.title);
              const tone = badgeTone(row.status);
              return (
                <View
                  key={row.id}
                  style={[
                    styles.tableRow,
                    index < group.rows.length - 1 && styles.tableRowBorder,
                  ]}
                >
                  <View style={[styles.rowIcon, { backgroundColor: visual.bg }]}>
                    <MaterialCommunityIcons name={visual.icon} size={20} color={visual.fg} />
                  </View>
                  <View style={styles.rowCopy}>
                    <Text style={styles.rowTitle} numberOfLines={1}>
                      {row.title}
                    </Text>
                    <Text style={styles.rowSub} numberOfLines={1}>
                      {row.subtitle}
                    </Text>
                  </View>
                  <Text style={styles.rowAmount}>{formatInr(row.amount)}</Text>
                  <View style={[styles.statusPill, { backgroundColor: tone.bg }]}>
                    <Text style={[styles.statusPillText, { color: tone.fg }]}>
                      {statusLabel(row.status)}
                    </Text>
                  </View>
                  {row.receiptId != null && onDownload ? (
                    <Pressable
                      onPress={() => onDownload(row)}
                      hitSlop={8}
                      style={styles.downloadBtn}
                      accessibilityLabel={t('fees.download')}
                    >
                      {downloadingId === row.id ? (
                        <ActivityIndicator size="small" color={colors.textSecondary} />
                      ) : (
                        <MaterialCommunityIcons
                          name="download-outline"
                          size={20}
                          color={colors.textSecondary}
                        />
                      )}
                    </Pressable>
                  ) : null}
                </View>
              );
            })}
          </View>
        </View>
      ))}
    </View>
  );
}

export function FeesScreen({ embedded = false }: Props) {
  const { t } = useAppLanguage();
  const studentId = useSelectionStore((s) => s.selectedStudentId);
  const [tab, setTab] = useState<FeesTab>('due');
  const [students, setStudents] = useState<ParentStudent[]>([]);
  const [ledger, setLedger] = useState<ParentFeeLedger | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receiptText, setReceiptText] = useState<string | null>(null);
  const [receiptId, setReceiptId] = useState<number | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadingRowId, setDownloadingRowId] = useState<string | null>(null);

  const selectedStudent = students.find((s) => s.id === studentId) ?? null;

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

  const overview = useMemo(() => overviewFeeItems(ledger), [ledger]);
  const receiptRows = useMemo<FeeTableRow[]>(() => {
    if (!ledger?.payments?.length) return [];
    return ledger.payments.map((p) => {
      const paidDate = parsePushTimestamp(p.paidAt);
      return {
        id: `pay-${p.paymentId}`,
        title: p.receiptNo || t('fees.receipt'),
        subtitle: formatReceiptPaidAt(p.paidAt) || p.paymentMode || '',
        monthTitle: paidDate ? format(paidDate, 'MMMM yyyy') : t('fees.receipts'),
        sortKey: paidDate ? paidDate.getFullYear() * 12 + paidDate.getMonth() : 0,
        amount: Number(p.amount) || 0,
        status: 'PAID',
        receiptId: p.receiptId,
      };
    });
  }, [ledger, t]);

  const historyGroups = useMemo(() => historyMonthGroups(ledger), [ledger]);
  const receiptGroups = useMemo(() => groupRows(receiptRows), [receiptRows]);

  const tabCounts: Record<FeesTab, number> = {
    due: overview.overdue.length + overview.dueThisMonth.length,
    history: historyGroups.reduce((sum, g) => sum + g.items.length, 0),
    receipts: receiptRows.length,
  };

  const downloadPdf = async (id: number, rowId?: string) => {
    if (studentId == null || downloading) return;
    setDownloading(true);
    if (rowId) setDownloadingRowId(rowId);
    try {
      const res = await getStudentFeeReceiptPdf(studentId, id);
      if (!res.status || !res.data?.contentBase64) {
        throw new Error(res.message || t('fees.receiptDownloadFailed'));
      }
      const result = await savePdfToDevice({
        fileName: res.data.fileName || `Receipt_${id}.pdf`,
        contentBase64: res.data.contentBase64,
        mimeType: res.data.mimeType || 'application/pdf',
      });
      if (result === 'cancelled') return;
      Alert.alert(
        '',
        result === 'shared' ? t('fees.receiptShared') : t('fees.receiptSaved')
      );
    } catch (e: any) {
      Alert.alert('', e?.message || t('fees.receiptDownloadFailed'));
    } finally {
      setDownloading(false);
      setDownloadingRowId(null);
    }
  };

  const openReceipt = async (id: number) => {
    if (studentId == null) return;
    try {
      const res = await getStudentFeeReceipt(studentId, id);
      if (res.status && res.data) {
        setReceiptId(id);
        setReceiptText(formatParentReceipt(res.data, t));
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

  const tabs: { id: FeesTab; label: string }[] = [
    { id: 'due', label: t('fees.overview') },
    { id: 'history', label: t('fees.paymentHistory') },
    { id: 'receipts', label: t('fees.receipts') },
  ];

  const body = (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={styles.scroll}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => void load(true)}
          tintColor={colors.primary}
        />
      }
    >
      <View style={styles.tabs}>
        {tabs.map((item) => {
          const active = tab === item.id;
          const count = tabCounts[item.id];
          return (
            <Pressable
              key={item.id}
              onPress={() => setTab(item.id)}
              style={styles.tabBtn}
            >
              <View style={styles.tabLabelRow}>
                <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
                  {item.label}
                </Text>
                {count > 0 ? (
                  <View style={[styles.tabBadge, active && styles.tabBadgeActive]}>
                    <Text style={[styles.tabBadgeText, active && styles.tabBadgeTextActive]}>
                      {count}
                    </Text>
                  </View>
                ) : null}
              </View>
              <View style={[styles.tabUnderline, active && styles.tabUnderlineActive]} />
            </Pressable>
          );
        })}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error ? (
        <EmptyState icon="alert-circle-outline" title={t('fees.loadFailed')} message={error} />
      ) : !ledger || (!ledger.hasAssignment && !(ledger.installments?.length > 0)) ? (
        <EmptyState
          icon="currency-inr"
          title={t('fees.emptyTitle')}
          message={t('fees.emptyMessage')}
        />
      ) : tab === 'due' ? (
        <OverviewPanel ledger={ledger} />
      ) : tab === 'history' ? (
        <HistoryPanel groups={historyGroups} />
      ) : (
        <FeesTable
          groups={receiptGroups}
          emptyIcon="receipt"
          emptyTitle={t('fees.emptyReceiptsTitle')}
          emptyMessage={t('fees.emptyReceiptsMessage')}
          downloadingId={downloadingRowId}
          onDownload={(row) => {
            if (row.receiptId == null) return;
            void openReceipt(row.receiptId);
          }}
          statusLabel={(status) => feeStatusLabel(status, t)}
        />
      )}

      {tab !== 'due' ? <FeesHelpBanner /> : null}

      <Modal visible={!!receiptText} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t('fees.receipt')}</Text>
            <Text style={styles.modalBody}>{receiptText}</Text>
            <View style={styles.modalActions}>
              <Pressable
                onPress={() => {
                  if (!receiptText) return;
                  void Share.share({
                    message: receiptText,
                    title: t('fees.receipt'),
                  });
                }}
                style={styles.modalBtn}
              >
                <Text style={styles.modalBtnText}>{t('fees.share')}</Text>
              </Pressable>
              <Pressable
                onPress={() => receiptId != null && void downloadPdf(receiptId)}
                disabled={downloading || receiptId == null}
                style={[styles.modalBtn, { opacity: downloading ? 0.7 : 1 }]}
              >
                {downloading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalBtnText}>{t('fees.download')}</Text>
                )}
              </Pressable>
              <Pressable
                onPress={() => {
                  setReceiptText(null);
                  setReceiptId(null);
                }}
                style={styles.modalBtn}
              >
                <Text style={styles.modalBtnText}>{t('common.close')}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );

  if (embedded) return <View style={styles.flex}>{body}</View>;

  return (
    <View style={styles.standalone}>
      <StudentModuleHero
        title={t('fees.title')}
        student={selectedStudent}
        onBack={() => navigateToTab({ tab: 'Home' })}
        backAccessibilityLabel={t('attendance.backHome')}
        rightAction={
          <Pressable
            onPress={() => setTab('receipts')}
            hitSlop={8}
            style={styles.navBtn}
            accessibilityLabel={t('fees.receipts')}
          >
            <MaterialCommunityIcons name="receipt" size={20} color={colors.headerOn} />
          </Pressable>
        }
      >
        <FeesSummaryCard ledger={ledger} />
      </StudentModuleHero>
      {body}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safe: { flex: 1 },
  standalone: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingHorizontal: spacing.lg, paddingBottom: 40 },
  center: { paddingVertical: 48, alignItems: 'center' },
  navBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.overlay,
  },
  summaryCard: {
    marginTop: -22,
    marginHorizontal: spacing.base,
    backgroundColor: colors.surface,
    borderRadius: 20,
    ...shadows.card,
    zIndex: 3,
    padding: 16,
  },
  summaryTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12,
  },
  summarySplit: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  summaryTotal: { flex: 1.2, minWidth: 0 },
  summaryHeroAmount: {
    marginTop: 4,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  summarySide: { flex: 1, gap: 10, minWidth: 0 },
  summarySideRow: { gap: 2 },
  summarySideAmount: {
    fontSize: 18,
    fontWeight: '800',
  },
  summaryKicker: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  tabs: {
    flexDirection: 'row',
    marginTop: 8,
    marginBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E6E8EE',
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 8,
  },
  tabLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingBottom: 10,
  },
  tabLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textTertiary,
  },
  tabLabelActive: {
    color: colors.primary,
    fontWeight: '800',
  },
  tabBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 5,
    backgroundColor: '#EEF0F3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBadgeActive: {
    backgroundColor: colors.primarySoft,
  },
  tabBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  tabBadgeTextActive: {
    color: colors.primary,
  },
  tabUnderline: {
    alignSelf: 'stretch',
    height: 3,
    borderRadius: 2,
    backgroundColor: 'transparent',
  },
  tabUnderlineActive: {
    backgroundColor: colors.primary,
  },
  group: { marginBottom: 18 },
  groupTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 10,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  countPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  countPillText: { fontSize: 11, fontWeight: '700' },
  overviewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#EEF0F3',
  },
  overviewNote: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '600',
  },
  chipRow: { gap: 8, paddingBottom: 14 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#EEF0F3',
  },
  chipActive: { backgroundColor: colors.primary },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  chipTextActive: { color: colors.headerOn },
  historyCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EEF0F3',
    marginBottom: 12,
    overflow: 'hidden',
  },
  historyHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  historyMonth: {
    flex: 1,
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },
  historyBody: { paddingHorizontal: 4, paddingBottom: 4 },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  totalPaidRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  totalPaidLabel: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  totalPaidValue: { fontSize: 15, fontWeight: '800', color: colors.success },
  monthPicker: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 24,
    marginTop: '30%',
  },
  monthPickRow: { paddingVertical: 12 },
  tableCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EEF0F3',
    overflow: 'hidden',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 10,
  },
  tableRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#EEF0F3',
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowCopy: { flex: 1, minWidth: 0 },
  rowTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  rowSub: {
    marginTop: 2,
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  rowAmount: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  downloadBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  helpCard: {
    marginTop: 8,
    backgroundColor: colors.primarySoft,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  helpText: {
    flex: 1,
    color: colors.primaryDark,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 32,
  },
  modalTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  modalBody: {
    color: colors.text,
    marginTop: 12,
    lineHeight: 22,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
    flexWrap: 'wrap',
  },
  modalBtn: {
    flex: 1,
    minWidth: 90,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
