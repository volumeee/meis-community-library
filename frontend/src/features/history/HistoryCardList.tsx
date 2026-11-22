import { ReturnAction } from './ReturnAction';
import { useI18n } from '../../store/useLocaleStore';
import { formatShortDate } from '../../utils/libraryLogic';
import type { HistoryRowsProps } from './historyTypes';

export function HistoryCardList({
  rows,
  confirmingReturnId,
  isSubmitting,
  onStart,
  onConfirm,
}: HistoryRowsProps) {
  const { locale, t } = useI18n();
  return (
    <ul
      className="md:hidden divide-y divide-slate-200 dark:divide-slate-800"
      data-testid="history-mobile-list"
    >
      {rows.map(({ tx, overdue }) => {
        const statusText =
          tx.status === 'Active' ? t.history.statusActive : t.history.statusReturned;
        return (
          <li key={tx.id} className="p-4 space-y-2.5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium text-sm text-slate-900 dark:text-slate-100">
                  {tx.borrowerName}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                  {tx.borrowerPhone} · {tx.referenceCode}
                </p>
              </div>
              <span
                className={`text-xs font-medium shrink-0 ${
                  tx.status === 'Active'
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                {statusText}
              </span>
            </div>

            <ul className="space-y-1 text-sm text-slate-800 dark:text-slate-200">
              {tx.items.map((item) => (
                <li key={`${tx.id}-m-${item.bookId}`}>
                  <span className="font-mono text-xs font-semibold tabular-nums text-slate-600 dark:text-slate-400">
                    {item.quantity}×
                  </span>{' '}
                  {item.bookTitle}
                </li>
              ))}
            </ul>

            <div className="flex items-center justify-between gap-2 pt-1 text-xs text-slate-500 dark:text-slate-400">
              <span className="font-mono tabular-nums">
                {t.history.duePrefix} {formatShortDate(tx.dueDate, locale)}
                {overdue ? (
                  <span className="text-red-700 dark:text-red-400 font-sans font-medium ml-1.5">
                    {t.history.overdue}
                  </span>
                ) : null}
              </span>
              {tx.status === 'Active' && (
                <ReturnAction
                  tx={tx}
                  compact
                  confirmingReturnId={confirmingReturnId}
                  isSubmitting={isSubmitting}
                  onStart={onStart}
                  onConfirm={onConfirm}
                />
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
