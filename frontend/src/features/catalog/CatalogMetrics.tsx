import { motion } from 'motion/react';
import { AnimatedNumber } from '../../components/ui/AnimatedNumber';
import { Skeleton } from '../../components/ui/Skeleton';
import { useI18n } from '../../store/useLocaleStore';
import type { CatalogStats, StockFilter } from '../../utils/libraryLogic';

interface CatalogMetricsProps {
  stats: CatalogStats;
  stockFilter: StockFilter;
  isLoading: boolean;
  onClearStockFilter: () => void;
  onJumpToActiveLoans: () => void;
  onToggleLowStockFilter: () => void;
}

export function CatalogMetrics({
  stats,
  stockFilter,
  isLoading,
  onClearStockFilter,
  onJumpToActiveLoans,
  onToggleLowStockFilter,
}: CatalogMetricsProps) {
  const { t } = useI18n();

  return (
    <section
      aria-label={t.catalog.collectionSummary}
      aria-busy={isLoading}
      className="catalog-metrics-grid bg-slate-200 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden"
    >
      <button
        type="button"
        disabled={isLoading || stockFilter === 'all'}
        onClick={onClearStockFilter}
        className="catalog-metric-cell bg-white dark:bg-surface-dark hover:bg-slate-50/90 dark:hover:bg-slate-800/50 disabled:hover:bg-white dark:disabled:hover:bg-surface-dark transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent dark:focus-visible:outline-blue-400"
      >
        <div className="flex items-center justify-between gap-2 min-h-[20px]">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate">
            {t.catalog.totalTitles}
          </p>
        </div>
        {isLoading ? (
          <Skeleton className="mt-2 h-7 w-12" />
        ) : (
          <p
            data-testid="metric-total-titles"
            className="mt-2 font-mono text-2xl font-semibold leading-none text-slate-900 dark:text-slate-50 tabular-nums"
          >
            <AnimatedNumber value={stats.totalTitles} />
          </p>
        )}
      </button>

      <div className="catalog-metric-cell bg-white dark:bg-surface-dark">
        <div className="flex items-center justify-between gap-2 min-h-[20px]">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate">
            {t.catalog.copiesOnShelf}
          </p>
        </div>
        {isLoading ? (
          <Skeleton className="mt-2 h-7 w-14" />
        ) : (
          <p
            data-testid="metric-total-copies"
            className="mt-2 font-mono text-2xl font-semibold leading-none text-slate-900 dark:text-slate-50 tabular-nums"
          >
            <AnimatedNumber value={stats.totalCopiesInStock} />
          </p>
        )}
      </div>

      <motion.button
        type="button"
        disabled={isLoading}
        whileTap={isLoading ? undefined : { scale: 0.99 }}
        onClick={onJumpToActiveLoans}
        className="catalog-metric-cell bg-white dark:bg-surface-dark hover:bg-slate-50/90 dark:hover:bg-slate-800/50 disabled:hover:bg-white dark:disabled:hover:bg-surface-dark transition-colors group focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent dark:focus-visible:outline-blue-400"
      >
        <div className="flex items-center justify-between gap-2 min-h-[20px]">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate">
            {t.catalog.activeLoans}
          </p>
          <span className="hidden sm:inline text-[11px] font-medium text-accent dark:text-blue-400 opacity-85 group-hover:opacity-100 whitespace-nowrap shrink-0">
            {t.catalog.viewActive}
          </span>
        </div>
        {isLoading ? (
          <>
            <Skeleton className="mt-2 h-7 w-10" />
            <Skeleton tone="subtle" className="mt-2 h-3.5 w-28" />
          </>
        ) : (
          <>
            <p
              data-testid="metric-active-loans"
              className="mt-2 font-mono text-2xl font-semibold leading-none text-slate-900 dark:text-slate-50 tabular-nums"
            >
              <AnimatedNumber value={stats.activeLoansCount} />
            </p>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums truncate">
              {t.catalog.copiesCheckedOut(stats.copiesCurrentlyOut)}
            </p>
            <span className="sm:hidden mt-1.5 text-[11px] font-medium text-accent dark:text-blue-400">
              {t.catalog.viewActive}
            </span>
          </>
        )}
      </motion.button>

      <motion.button
        type="button"
        disabled={isLoading}
        whileTap={isLoading ? undefined : { scale: 0.99 }}
        onClick={onToggleLowStockFilter}
        aria-pressed={stockFilter === 'low'}
        className={`catalog-metric-cell transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-amber-600 dark:focus-visible:outline-amber-400 ${
          stockFilter === 'low'
            ? 'bg-amber-50 dark:bg-amber-950/40 ring-1 ring-inset ring-amber-400/70 dark:ring-amber-500/50'
            : 'bg-white dark:bg-surface-dark hover:bg-slate-50/90 dark:hover:bg-slate-800/50 disabled:hover:bg-white dark:disabled:hover:bg-surface-dark'
        }`}
      >
        <div className="flex items-center justify-between gap-2 min-h-[20px]">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate">
            {t.catalog.runningLowLabel}
          </p>
          <span className="hidden sm:inline text-[11px] font-medium text-amber-700 dark:text-amber-400 whitespace-nowrap shrink-0">
            {stockFilter === 'low' ? t.catalog.filtered : t.catalog.filterList}
          </span>
        </div>
        {isLoading ? (
          <Skeleton className="mt-2 h-7 w-10" />
        ) : (
          <>
            <p
              data-testid="metric-low-stock"
              className={`mt-2 font-mono text-2xl font-semibold leading-none tabular-nums ${
                stats.lowStockCount > 0
                  ? 'text-amber-700 dark:text-amber-400'
                  : 'text-slate-900 dark:text-slate-50'
              }`}
            >
              <AnimatedNumber value={stats.lowStockCount} />
            </p>
            <span className="sm:hidden mt-2 text-[11px] font-medium text-amber-700 dark:text-amber-400">
              {stockFilter === 'low' ? t.catalog.filtered : t.catalog.filterList}
            </span>
          </>
        )}
      </motion.button>
    </section>
  );
}
