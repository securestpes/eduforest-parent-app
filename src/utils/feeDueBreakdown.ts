import type { ParentFeeLedger } from '../services/parent';

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
