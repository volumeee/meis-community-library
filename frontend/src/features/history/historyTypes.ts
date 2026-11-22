import type { LendingTransaction } from '@shared/library';

export interface HistoryRowsProps {
  rows: { tx: LendingTransaction; overdue: boolean }[];
  confirmingReturnId: string | null;
  isSubmitting: boolean;
  onStart: (id: string | null) => void;
  onConfirm: (id: string) => Promise<void>;
}
