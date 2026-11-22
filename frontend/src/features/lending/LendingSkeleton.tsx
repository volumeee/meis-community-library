import { Skeleton } from '../../components/ui/Skeleton';
import { useI18n } from '../../store/useLocaleStore';

const SHELF_PICKER_WIDTHS = [
  { title: 'w-48', sub: 'w-56' },
  { title: 'w-40', sub: 'w-48' },
  { title: 'w-52', sub: 'w-60' },
  { title: 'w-44', sub: 'w-52' },
  { title: 'w-56', sub: 'w-48' },
  { title: 'w-36', sub: 'w-44' },
] as const;

export function LendingViewSkeleton() {
  const { t } = useI18n();

  return (
    <div
      role="status"
      aria-busy="true"
      aria-label={t.lending.loadingLabel}
      data-testid="lending-skeleton"
      className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start"
    >
      <span className="sr-only">{t.lending.loadingLabel}</span>
      <div className="lg:col-span-7 space-y-6">
        <section className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-slate-800">
            <Skeleton className="h-4 w-36" />
          </div>
          <div className="px-5 py-8 flex flex-col items-center justify-center gap-2">
            <Skeleton tone="subtle" className="h-4 w-72 max-w-full" />
          </div>
        </section>

        <section className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center gap-3">
            <Skeleton className="h-4 w-32" />
            <div className="flex-1 flex flex-col sm:flex-row gap-2 sm:justify-end">
              <Skeleton
                tone="subtle"
                className="h-10 w-full sm:max-w-[220px] rounded-md"
              />
              <Skeleton tone="subtle" className="h-10 w-full sm:w-28 rounded-md" />
            </div>
          </div>

          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {SHELF_PICKER_WIDTHS.map((row, index) => (
              <div
                key={index}
                className="px-5 py-3 flex items-center justify-between gap-4"
              >
                <div className="min-w-0 flex-1 space-y-1.5">
                  <Skeleton className={`h-4 max-w-full ${row.title}`} />
                  <Skeleton tone="subtle" className={`h-3.5 max-w-full ${row.sub}`} />
                </div>
                <Skeleton
                  tone="subtle"
                  className="h-[40px] sm:h-[34px] w-16 rounded-md shrink-0"
                />
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="lg:col-span-5 lg:sticky lg:top-24 bg-white dark:bg-surface-dark border border-slate-200 dark:border-slate-800 rounded-lg p-6">
        <Skeleton className="h-5 w-36" />
        <Skeleton tone="subtle" className="mt-2 h-3.5 w-64 max-w-full" />

        <div className="mt-5 space-y-4">
          {['w-28', 'w-24', 'w-20'].map((labelWidth, index) => (
            <div key={index} className="space-y-1.5">
              <Skeleton tone="subtle" className={`h-3.5 ${labelWidth}`} />
              <Skeleton tone="subtle" className="h-11 w-full rounded-md" />
            </div>
          ))}

          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <Skeleton tone="subtle" className="h-4 w-24" />
              <Skeleton className="h-4 w-8" />
            </div>
            <div className="flex items-center justify-between">
              <Skeleton tone="subtle" className="h-4 w-32" />
              <Skeleton className="h-4 w-8" />
            </div>
          </div>

          <Skeleton className="h-[44px] w-full rounded-md" />
        </div>
      </section>
    </div>
  );
}
