import { useMemo, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { motion } from 'motion/react';
import type { HistoryStatusFilter } from '../../store/useLibraryStore';
import { useI18n } from '../../store/useLocaleStore';
import type { LendingTransaction } from '@shared/library';
import { isLoanOverdue } from '../../utils/libraryLogic';
import { useLocalTodayIso } from '../../hooks/useLocalTodayIso';
import { Skeleton } from '../../components/ui/Skeleton';
import { HistoryListSkeleton } from './HistorySkeleton';
import { HistoryCardList } from './HistoryCardList';
import { HistoryTable } from './HistoryTable';

interface HistoryViewProps {
  lendings: LendingTransaction[];
  statusFilter: HistoryStatusFilter;
  onStatusFilterChange: (status: HistoryStatusFilter) => void;
  isLoading: boolean;
  isSubmitting: boolean;
  onReturnLending: (id: string) => Promise<void>;
  onGoToLend: () => void;
}

export function HistoryView({
  lendings,
  statusFilter,
  onStatusFilterChange,
  isLoading,
  isSubmitting,
  onReturnLending,
  onGoToLend,
}: HistoryViewProps) {
  const { t } = useI18n();
  const today = useLocalTodayIso();
  const [query, setQuery] = useState('');
  const [confirmingReturnId, setConfirmingReturnId] = useState<string | null>(null);
  const returningRef = useRef(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const statusLabels: Record<HistoryStatusFilter, string> = {
    All: t.history.statusAll,
    Active: t.history.statusActive,
    Returned: t.history.statusReturned,
  };

  const counts = useMemo(() => {
    const active = lendings.filter((l) => l.status === 'Active').length;
    const returned = lendings.length - active;
    return { All: lendings.length, Active: active, Returned: returned };
  }, [lendings]);

  const filteredLendings = useMemo(() => {
    const q = query.trim().toLowerCase();
    return lendings
      .filter((tx) => {
        if (statusFilter !== 'All' && tx.status !== statusFilter) return false;
        if (!q) return true;
        return (
          tx.borrowerName.toLowerCase().includes(q) ||
          tx.borrowerPhone.toLowerCase().includes(q) ||
          tx.referenceCode.toLowerCase().includes(q) ||
          tx.items.some((item) => item.bookTitle.toLowerCase().includes(q))
        );
      })
      .map((tx) => ({ tx, overdue: isLoanOverdue(tx.dueDate, tx.status, today) }));
  }, [lendings, statusFilter, query, today]);

  const handleConfirmReturn = async (id: string) => {
    if (isSubmitting || returningRef.current) return;
    returningRef.current = true;
    try {
      await onReturnLending(id);
    } finally {
      returningRef.current = false;
      setConfirmingReturnId((prev) => (prev === id ? null : prev));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            {t.history.heading}
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {t.history.subheading}
          </p>
        </div>
        <motion.button
          type="button"
          whileTap={{ scale: 0.97 }}
          onClick={onGoToLend}
          className="self-start sm:self-auto min-h-[44px] sm:min-h-[38px] px-4 py-2 text-sm font-medium text-slate-800 dark:text-slate-100 bg-white dark:bg-surface-dark border border-slate-300 dark:border-slate-700 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
        >
          {t.history.newCheckout}
        </motion.button>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div
          role="group"
          aria-label={t.history.filterStatusAria}
          className="inline-flex items-center p-1 bg-slate-200/75 dark:bg-slate-800/80 rounded-md self-start"
        >
          {(['All', 'Active', 'Returned'] as const).map((status) => {
            const isSelected = statusFilter === status;
            return (
              <button
                key={status}
                type="button"
                disabled={isLoading}
                onClick={() => onStatusFilterChange(status)}
                aria-pressed={isSelected}
                className={`relative px-3.5 py-2 sm:py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap disabled:opacity-75 ${
                  isSelected
                    ? 'text-slate-900 dark:text-slate-50'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                {isSelected && (
                  <motion.span
                    layoutId="history-status-pill"
                    transition={{ type: 'spring', stiffness: 460, damping: 34 }}
                    className="absolute inset-0 rounded bg-white dark:bg-surface-dark shadow-xs"
                    aria-hidden="true"
                  />
                )}
                <span className="relative z-10 inline-flex items-center gap-1.5">
                  <span>{statusLabels[status]}</span>
                  {isLoading ? (
                    <Skeleton className="h-3 w-4" />
                  ) : (
                    <span className="font-mono text-[11px] tabular-nums opacity-70">
                      {counts[status]}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>

        <div className="relative w-full sm:max-w-xs">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 dark:text-slate-400"
            aria-hidden="true"
          />
          <label htmlFor="history-search" className="sr-only">
            {t.history.searchLabel}
          </label>
          <input
            ref={searchInputRef}
            id="history-search"
            type="text"
            disabled={isLoading}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.history.searchPlaceholder}
            className="w-full h-11 pl-9 pr-10 bg-white dark:bg-surface-dark border border-slate-200 dark:border-slate-800 rounded-md text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 disabled:opacity-60 focus:border-accent dark:focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-accent/15 dark:focus:ring-blue-500/20"
          />
          {query.length > 0 && (
            <button
              type="button"
              disabled={isLoading}
              onClick={() => {
                setQuery('');
                searchInputRef.current?.focus();
              }}
              aria-label={t.history.clearSearch}
              className="absolute right-1 top-1/2 -translate-y-1/2 inline-flex h-9 w-9 items-center justify-center rounded text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-40"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
        {isLoading ? (
          <HistoryListSkeleton />
        ) : lendings.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-50">
              {t.history.emptyTitle}
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              {t.history.emptyBody}
            </p>
            <motion.button
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={onGoToLend}
              className="mt-4 min-h-[44px] px-4 py-2 text-sm font-medium text-white bg-accent dark:bg-blue-600 rounded-md hover:bg-accent-hover dark:hover:bg-blue-500 whitespace-nowrap"
            >
              {t.history.startCheckout}
            </motion.button>
          </div>
        ) : filteredLendings.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-50">
              {t.history.noMatchesTitle}
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              {t.history.noMatchesBody}
            </p>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
          >
            <HistoryCardList
              rows={filteredLendings}
              confirmingReturnId={confirmingReturnId}
              isSubmitting={isSubmitting}
              onStart={setConfirmingReturnId}
              onConfirm={handleConfirmReturn}
            />
            <HistoryTable
              rows={filteredLendings}
              confirmingReturnId={confirmingReturnId}
              isSubmitting={isSubmitting}
              onStart={setConfirmingReturnId}
              onConfirm={handleConfirmReturn}
            />
          </motion.div>
        )}
      </div>
    </div>
  );
}
