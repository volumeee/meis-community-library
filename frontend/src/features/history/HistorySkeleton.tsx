import { Skeleton } from '../../components/ui/Skeleton';
import { useI18n } from '../../store/useLocaleStore';

const HISTORY_ROW_SHAPES = [
  { borrower: 'w-32', phone: 'w-28', titles: ['w-48', 'w-40'], active: true },
  { borrower: 'w-36', phone: 'w-24', titles: ['w-52'], active: true },
  { borrower: 'w-28', phone: 'w-28', titles: ['w-44', 'w-36'], active: false },
  { borrower: 'w-32', phone: 'w-24', titles: ['w-40'], active: false },
] as const;

export function HistoryListSkeleton() {
  const { t } = useI18n();

  return (
    <div
      role="status"
      aria-busy="true"
      aria-label={t.history.heading}
      data-testid="history-skeleton"
    >
      <span className="sr-only">{t.history.heading}</span>

      {/* Mobile stacked history cards */}
      <ul className="md:hidden divide-y divide-slate-200 dark:divide-slate-800">
        {HISTORY_ROW_SHAPES.map((row, index) => (
          <li key={index} className="p-4 space-y-2.5">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1.5">
                <Skeleton className={`h-4 ${row.borrower}`} />
                <Skeleton tone="subtle" className="h-3.5 w-40" />
              </div>
              <Skeleton tone="subtle" className="h-4 w-14 shrink-0" />
            </div>
            <div className="space-y-1.5">
              {row.titles.map((width, itemIdx) => (
                <Skeleton key={itemIdx} tone="subtle" className={`h-4 ${width}`} />
              ))}
            </div>
            <div className="flex items-center justify-between gap-2 pt-1">
              <Skeleton tone="subtle" className="h-4 w-28" />
              {row.active && <Skeleton tone="subtle" className="h-[44px] w-28 rounded" />}
            </div>
          </li>
        ))}
      </ul>

      {/* Desktop 6-column history table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left border-collapse">
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
            {HISTORY_ROW_SHAPES.map((row, index) => (
              <tr key={index}>
                <td className="py-3.5 pl-5 pr-4 align-top">
                  <div className="space-y-1.5">
                    <Skeleton className="h-3.5 w-24" />
                    <Skeleton tone="subtle" className="h-3.5 w-20" />
                  </div>
                </td>
                <td className="py-3.5 px-4 align-top">
                  <div className="space-y-1.5">
                    <Skeleton className={`h-4 ${row.borrower}`} />
                    <Skeleton tone="subtle" className={`h-3.5 ${row.phone}`} />
                  </div>
                </td>
                <td className="py-3.5 px-4 align-top">
                  <div className="space-y-1.5">
                    {row.titles.map((width, itemIdx) => (
                      <Skeleton key={itemIdx} tone="subtle" className={`h-4 ${width}`} />
                    ))}
                  </div>
                </td>
                <td className="py-3.5 px-4 align-top">
                  <div className="flex justify-end">
                    <Skeleton className="h-4 w-6" />
                  </div>
                </td>
                <td className="py-3.5 px-4 align-top">
                  <Skeleton tone="subtle" className="h-3.5 w-20" />
                </td>
                <td className="py-3.5 pl-4 pr-5 align-top">
                  <div className="flex flex-col items-end gap-1.5">
                    <Skeleton tone="subtle" className="h-3.5 w-14" />
                    {row.active ? (
                      <Skeleton tone="subtle" className="h-7 w-24 rounded" />
                    ) : (
                      <Skeleton tone="subtle" className="h-3.5 w-20" />
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
