import type {
  ParentFeeInstallment,
  ParentFeeLedger,
  ParentFeePayment,
} from '../services/parent';
import type { AppLanguage } from '../common/contexts/parentTranslations';
import { appBcp47Locale } from './appDateLocale';

export type FeeDueBreakdownLine = {
  feeHeadId?: number;
  feeHeadName: string;
  amount: number;
};

export function ledgerDueBreakdown(
  ledger: ParentFeeLedger | null | undefined
): FeeDueBreakdownLine[] {
  if (ledger?.dueBreakdown?.length) {
    return ledger.dueBreakdown
      .map((line) => ({
        feeHeadId: line.feeHeadId,
        feeHeadName: line.feeHeadName || 'Fee',
        amount: Number(line.amount) || 0,
      }))
      .filter((line) => line.amount > 0)
      .sort((a, b) => b.amount - a.amount);
  }

  if (!ledger?.installments?.length) return [];
  const byHead = new Map<string, FeeDueBreakdownLine>();
  for (const inst of ledger.installments) {
    for (const head of inst.heads || []) {
      const balance = Number(head.balance) || 0;
      if (balance <= 0) continue;
      const key = String(head.feeHeadId ?? head.feeHeadName);
      const existing = byHead.get(key);
      if (existing) {
        existing.amount += balance;
      } else {
        byHead.set(key, {
          feeHeadId: head.feeHeadId,
          feeHeadName: head.feeHeadName || 'Fee',
          amount: balance,
        });
      }
    }
  }
  return Array.from(byHead.values()).sort((a, b) => b.amount - a.amount);
}

export function formatDueBreakdown(
  lines: FeeDueBreakdownLine[],
  compact = false
): string {
  if (!lines.length) return '';
  return lines
    .map((line) => {
      const amount = Number(line.amount) || 0;
      const formatted = compact ? amount.toFixed(0) : amount.toFixed(2);
      return `${line.feeHeadName} ₹${formatted}`;
    })
    .join(' · ');
}

type InstallmentHeadLike = {
  feeHeadName?: string;
  amount?: number;
  balance?: number;
};

export type PayableFeeSummary = {
  dueThisMonth: number;
  overdue: number;
  pending: number;
  dueDate: string | null;
};

export type OverviewFeeItem = {
  id: string;
  title: string;
  monthLabel: string;
  amount: number;
  dueDate: string | null;
  kind: 'overdue' | 'due';
};

export type HistoryFeeItem = {
  title: string;
  amount: number;
  paidOn: string | null;
  receiptId?: number;
};

export type HistoryMonthGroup = {
  key: string;
  title: string;
  sortKey: number;
  status: 'paid' | 'overdue' | 'due';
  totalPaid: number;
  receiptId?: number;
  items: HistoryFeeItem[];
};

export function installmentCalendarMonth(inst: ParentFeeInstallment): { year: number; month: number } {
  const year =
    inst.yearValue ||
    Number(String(inst.dueDate || '').slice(0, 4)) ||
    new Date().getFullYear();
  const month =
    inst.monthValue ||
    Number(String(inst.dueDate || '').slice(5, 7)) ||
    1;
  return { year, month };
}

function unpaidBalance(inst: ParentFeeInstallment): number {
  const status = (inst.status || '').toUpperCase();
  if (status === 'PAID' || status === 'COLLECTED' || status === 'WAIVED') return 0;
  return Math.max(0, Number(inst.balance) || 0);
}

function isPastDue(dueDate?: string | null): boolean {
  if (!dueDate) return false;
  const raw = dueDate.length <= 10 ? `${dueDate}T00:00:00` : dueDate;
  const due = new Date(raw);
  if (Number.isNaN(due.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  return due.getTime() < today.getTime();
}

export function isOverdueInstallment(inst: ParentFeeInstallment): boolean {
  const status = (inst.status || '').toUpperCase();
  return status === 'OVERDUE' || !!inst.overdue || isPastDue(inst.dueDate);
}

function isFutureInstallment(inst: ParentFeeInstallment, now: Date): boolean {
  const status = (inst.status || '').toUpperCase();
  if (status.includes('FUTURE')) return true;
  const { year, month } = installmentCalendarMonth(inst);
  const currentKey = now.getFullYear() * 12 + (now.getMonth() + 1);
  return year * 12 + month > currentKey;
}

/** Current-month due, overdue now, and payable pending (excludes future months). */
export function payableFeeSummary(
  ledger: ParentFeeLedger | null | undefined,
  now = new Date()
): PayableFeeSummary {
  let dueThisMonth = 0;
  let overdue = 0;
  let dueDate: string | null = null;
  const y = now.getFullYear();
  const m = now.getMonth() + 1;

  for (const inst of ledger?.installments || []) {
    const amount = unpaidBalance(inst);
    if (amount <= 0) continue;
    if (isFutureInstallment(inst, now)) continue;

    const { year, month } = installmentCalendarMonth(inst);
    const current = year === y && month === m;
    if (isOverdueInstallment(inst)) {
      overdue += amount;
      continue;
    }
    if (current) {
      dueThisMonth += amount;
      dueDate = inst.dueDate || dueDate;
    }
  }

  return {
    dueThisMonth,
    overdue,
    pending: dueThisMonth + overdue,
    dueDate,
  };
}

function parsePaymentDate(value?: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function receiptIdForInstallment(
  inst: ParentFeeInstallment,
  payments: ParentFeePayment[]
): number | undefined {
  if (!payments.length) return undefined;
  const receiptNo = inst.lastReceiptNo?.trim();
  if (receiptNo) {
    const byNumber = payments.find(
      (payment) =>
        payment.receiptId != null && (payment.receiptNo || '').trim() === receiptNo
    );
    if (byNumber?.receiptId != null) return byNumber.receiptId;
  }

  const collected = parsePaymentDate(inst.collectedDate || inst.collectedAt);
  if (collected) {
    const sameDay = payments.filter((payment) => {
      const paidAt = parsePaymentDate(payment.paidAt);
      return (
        payment.receiptId != null &&
        paidAt != null &&
        paidAt.getFullYear() === collected.getFullYear() &&
        paidAt.getMonth() === collected.getMonth() &&
        paidAt.getDate() === collected.getDate()
      );
    });
    if (sameDay.length === 1) return sameDay[0].receiptId;
  }

  const { year, month } = installmentCalendarMonth(inst);
  const inMonth = payments
    .filter((payment) => {
      const paidAt = parsePaymentDate(payment.paidAt);
      return (
        payment.receiptId != null &&
        paidAt != null &&
        paidAt.getFullYear() === year &&
        paidAt.getMonth() + 1 === month
      );
    })
    .sort((a, b) => {
      const left = parsePaymentDate(a.paidAt)?.getTime() ?? 0;
      const right = parsePaymentDate(b.paidAt)?.getTime() ?? 0;
      return right - left;
    });
  return inMonth[0]?.receiptId;
}

function installmentDate(inst: ParentFeeInstallment): Date {
  const { year, month } = installmentCalendarMonth(inst);
  return new Date(year, month - 1, 1);
}

function installmentHeads(inst: ParentFeeInstallment) {
  if (inst.heads?.length) return inst.heads;
  return [
    {
      demandId: 0,
      feeHeadId: 0,
      feeHeadName: inst.label,
      amount: inst.amount,
      paidAmount: inst.paidAmount,
      balance: inst.balance,
      status: inst.status,
    },
  ];
}

export function overviewFeeItems(
  ledger: ParentFeeLedger | null | undefined,
  now = new Date(),
  language: AppLanguage = 'en'
): { overdue: OverviewFeeItem[]; dueThisMonth: OverviewFeeItem[] } {
  const overdue: OverviewFeeItem[] = [];
  const dueThisMonth: OverviewFeeItem[] = [];
  const y = now.getFullYear();
  const m = now.getMonth() + 1;

  for (const inst of ledger?.installments || []) {
    const unpaid = unpaidBalance(inst);
    if (unpaid <= 0) continue;
    if (isFutureInstallment(inst, now)) continue;
    const date = installmentDate(inst);
    const { year, month } = installmentCalendarMonth(inst);
    const current = year === y && month === m;
    const overdueInst = isOverdueInstallment(inst);

    for (const head of installmentHeads(inst)) {
      const amount = Math.max(0, Number(head.balance) || 0);
      if (amount <= 0) continue;
      const item: OverviewFeeItem = {
        id: `${inst.key}-${head.demandId || head.feeHeadName}`,
        title: head.feeHeadName || inst.label,
        monthLabel: date.toLocaleString(appBcp47Locale(language), { month: 'long', year: 'numeric' }),
        amount,
        dueDate: inst.dueDate || null,
        kind: overdueInst ? 'overdue' : 'due',
      };
      if (overdueInst) overdue.push(item);
      else if (current) dueThisMonth.push(item);
    }
  }

  overdue.sort((a, b) => a.monthLabel.localeCompare(b.monthLabel));
  dueThisMonth.sort((a, b) => a.title.localeCompare(b.title));
  return { overdue, dueThisMonth };
}

export function historyMonthGroups(
  ledger: ParentFeeLedger | null | undefined,
  language: AppLanguage = 'en'
): HistoryMonthGroup[] {
  const map = new Map<string, HistoryMonthGroup>();
  const payments = ledger?.payments || [];

  for (const inst of ledger?.installments || []) {
    const date = installmentDate(inst);
    const key = `${date.getFullYear()}-${date.getMonth()}`;
    const title = date.toLocaleString(appBcp47Locale(language), { month: 'long', year: 'numeric' });
    const sortKey = date.getFullYear() * 12 + date.getMonth();
    let group = map.get(key);
    if (!group) {
      group = {
        key,
        title,
        sortKey,
        status: 'paid',
        totalPaid: 0,
        items: [],
      };
      map.set(key, group);
    }

    const unpaid = unpaidBalance(inst);
    if (unpaid > 0 && isOverdueInstallment(inst)) group.status = 'overdue';
    else if (unpaid > 0 && group.status === 'paid') group.status = 'due';

    const receiptId = receiptIdForInstallment(inst, payments);

    for (const head of installmentHeads(inst)) {
      const paidAmount = Number(head.paidAmount) || 0;
      if (paidAmount <= 0) continue;
      group.totalPaid += paidAmount;
      group.items.push({
        title: head.feeHeadName || inst.label,
        amount: paidAmount,
        paidOn: inst.collectedDate || inst.collectedAt || null,
        receiptId,
      });
    }
  }

  return Array.from(map.values())
    .filter((g) => g.items.length > 0)
    .map((group) => {
      const receiptIds = [
        ...new Set(
          group.items
            .map((item) => item.receiptId)
            .filter((id): id is number => typeof id === 'number')
        ),
      ];
      return {
        ...group,
        receiptId: receiptIds.length === 1 ? receiptIds[0] : undefined,
      };
    })
    .sort((a, b) => a.sortKey - b.sortKey);
}

/** Per-month split when one installment has tuition + exam etc. */
export function installmentHeadBreakdown(
  heads: InstallmentHeadLike[] | undefined,
  compact = false
): string {
  if (!heads || heads.length <= 1) return '';
  return heads
    .map((head) => {
      const balance = Number(head.balance) || 0;
      const amount = balance > 0 ? balance : Number(head.amount) || 0;
      const formatted = compact ? amount.toFixed(0) : amount.toFixed(2);
      return `${head.feeHeadName || 'Fee'} ₹${formatted}`;
    })
    .join(' · ');
}
