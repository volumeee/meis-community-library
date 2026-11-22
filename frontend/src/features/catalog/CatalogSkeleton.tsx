import { Skeleton } from '../../components/ui/Skeleton';
import { useI18n } from '../../store/useLocaleStore';

const CATALOG_ROW_WIDTHS = [
  { title: 'w-48', author: 'w-32', genre: 'w-20', meta: 'w-36' },
  { title: 'w-56', author: 'w-28', genre: 'w-24', meta: 'w-32' },
  { title: 'w-40', author: 'w-36', genre: 'w-16', meta: 'w-36' },
  { title: 'w-52', author: 'w-24', genre: 'w-20', meta: 'w-28' },
  { title: 'w-44', author: 'w-32', genre: 'w-24', meta: 'w-36' },
  { title: 'w-60', author: 'w-28', genre: 'w-16', meta: 'w-32' },
] as const;

export function CatalogListSkeleton() {
  const { t } = useI18n();

  return (
    <div
      role="status"
      aria-busy="true"
      aria-label={t.catalog.heading}
      data-testid="catalog-skeleton"
    >
      <span className="sr-only">{t.catalog.heading}</span>

      <ul className="md:hidden catalog-book-grid">
        {CATALOG_ROW_WIDTHS.slice(0, 4).map((row, index) => (
          <li
            key={index}
            className="catalog-book-card rounded-lg bg-white dark:bg-surface-dark border border-slate-200/90 dark:border-slate-800"
          >
            <div className="flex items-start gap-3 min-w-0">
              <Skeleton className="w-9 h-12 rounded shrink-0" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <Skeleton className={`h-4 max-w-full ${row.title}`} />
                <Skeleton tone="subtle" className={`h-3.5 max-w-full ${row.author}`} />
                <Skeleton tone="subtle" className={`h-3 max-w-full ${row.genre}`} />
              </div>
            </div>
            <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800/80">
              <Skeleton className="h-4 w-20" />
              <div className="flex items-center gap-2 shrink-0">
                <Skeleton tone="subtle" className="h-10 w-16 rounded-md" />
                <Skeleton tone="subtle" className="h-10 w-14 rounded-md" />
              </div>
            </div>
          </li>
        ))}
      </ul>

      <div className="hidden md:block overflow-x-auto">
        <table className="catalog-table w-full text-left border-collapse">
          <colgroup>
            <col className="w-[38%]" />
            <col className="w-[15%]" />
            <col className="w-[21%]" />
            <col className="w-[12%]" />
            <col className="w-[14%]" />
          </colgroup>
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 text-xs font-semibold text-slate-600 dark:text-slate-400">
              <th scope="col" className="whitespace-nowrap">
                {t.catalog.colTitleAuthor}
              </th>
              <th scope="col" className="whitespace-nowrap">
                {t.catalog.colGenre}
              </th>
              <th scope="col" className="whitespace-nowrap">
                {t.catalog.colYearIsbn}
              </th>
              <th scope="col" className="text-right whitespace-nowrap">
                {t.catalog.colStock}
              </th>
              <th scope="col" className="text-right whitespace-nowrap">
                {t.catalog.colActions}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-sm">
            {CATALOG_ROW_WIDTHS.map((row, index) => (
              <tr key={index}>
                <td>
                  <div className="flex items-center gap-3.5">
                    <Skeleton className="w-9 h-12 rounded shrink-0" />
                    <div className="space-y-1.5">
                      <Skeleton className={`h-4 ${row.title}`} />
                      <Skeleton tone="subtle" className={`h-3.5 ${row.author}`} />
                    </div>
                  </div>
                </td>
                <td>
                  <Skeleton tone="subtle" className={`h-4 ${row.genre}`} />
                </td>
                <td>
                  <Skeleton tone="subtle" className={`h-3.5 ${row.meta}`} />
                </td>
                <td>
                  <div className="flex flex-col items-end space-y-1.5">
                    <Skeleton className="h-4 w-7" />
                    <Skeleton tone="subtle" className="h-3.5 w-16" />
                  </div>
                </td>
                <td>
                  <div className="flex items-center justify-end gap-1.5">
                    <Skeleton tone="subtle" className="h-7 w-14 rounded-md" />
                    <Skeleton tone="subtle" className="h-9 w-9 rounded-md" />
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
