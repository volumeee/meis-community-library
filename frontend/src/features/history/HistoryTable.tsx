import { ReturnAction } from './ReturnAction';
import { useI18n } from '../../store/useLocaleStore';
import { formatShortDate } from '../../utils/libraryLogic';
import type { HistoryRowsProps } from './historyTypes';

export function HistoryTable({
  rows,
  confirmingReturnId,
  isSubmitting,
  onStart,
  onConfirm,
}: HistoryRowsProps) {
  const { locale, t } = useI18n();
  return (
    <div className="hidden md:block overflow-x-auto">
      <table className="w-full text-left border-collapse" data-testid="history-table">
        <thead>
          <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 text-xs font-semibold text-slate-600 dark:text-slate-400">
            <th scope="col" className="py-3 pl-5 pr-4 whitespace-nowrap">
              {t.history.colRefDate}
            </th>
            <th scope="col" className="py-3 px-4 whitespace-nowrap">
              {t.history.colBorrower}
            </th>
            <th scope="col" className="py-3 px-4 whitespace-nowrap">
              {t.history.colBooksLent}
            </th>
            <th scope="col" className="py-3 px-4 text-right whitespace-nowrap">
              {t.history.colCopies}
            </th>
            <th scope="col" className="py-3 px-4 whitespace-nowrap">
              {t.history.colDueDate}
            </th>
            <th scope="col" className="py-3 pl-4 pr-5 text-right whitespace-nowrap">
              {t.history.colStatusAction}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-sm">
          {rows.map(({ tx, overdue }) => {
            return (
              <tr
                key={tx.id}
                data-testid="history-row"
                className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
              >
                <td className="py-3.5 pl-5 pr-4 align-top whitespace-nowrap">
                  <div className="font-mono text-xs font-semibold text-slate-900 dark:text-slate-100">
                    {tx.referenceCode}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-mono tabular-nums">
                    {formatShortDate(tx.lentAt, locale)}
                  </div>
                </td>
                <td className="py-3.5 px-4 align-top whitespace-nowrap">
                  <div className="font-medium text-slate-900 dark:text-slate-100">
                    {tx.borrowerName}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                    {tx.borrowerPhone}
                  </div>
                </td>
                <td className="py-3.5 px-4 align-top">
                  <ul className="space-y-1">
                    {tx.items.map((item) => (
                      <li
                        key={`${tx.id}-${item.bookId}`}
                        className="text-sm text-slate-800 dark:text-slate-200"
                      >
                        <span className="font-mono text-xs font-semibold tabular-nums text-slate-600 dark:text-slate-400">
                          {item.quantity}×
                        </span>{' '}
                        <span>{item.bookTitle}</span>
                      </li>
                    ))}
                  </ul>
                </td>
                <td className="py-3.5 px-4 align-top text-right font-mono font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                  {tx.totalCopies}
                </td>
                <td className="py-3.5 px-4 align-top whitespace-nowrap">
                  <div className="font-mono text-xs tabular-nums text-slate-900 dark:text-slate-100">
                    {formatShortDate(tx.dueDate, locale)}
                  </div>
                  {overdue && (
                    <div className="text-xs font-medium text-red-700 dark:text-red-400 mt-0.5">
                      {t.history.overdue}
                    </div>
                  )}
                </td>
                <td className="py-3.5 pl-4 pr-5 align-top text-right whitespace-nowrap">
                  {tx.status === 'Active' ? (
                    <div className="flex flex-col items-end gap-1.5">
                      <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                        {t.history.statusActive}
                      </span>
                      <ReturnAction
                        tx={tx}
                        confirmingReturnId={confirmingReturnId}
                        isSubmitting={isSubmitting}
                        onStart={onStart}
                        onConfirm={onConfirm}
                      />
                    </div>
                  ) : (
                    <div>
                      <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        {t.history.statusReturned}
                      </div>
                      {tx.returnedAt && (
                        <div className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums mt-0.5">
                          {formatShortDate(tx.returnedAt, locale)}
                        </div>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
