import { useMemo } from 'react';
import { Plus } from 'lucide-react';
import { motion } from 'motion/react';
import { useShallow } from 'zustand/react/shallow';
import type { Book } from '@shared/library';
import { Skeleton } from '../../components/ui/Skeleton';
import { useLibraryStore } from '../../store/useLibraryStore';
import { useI18n } from '../../store/useLocaleStore';
import {
  ALL_GENRES_FILTER,
  computeCatalogStats,
  filterAndSortBooks,
} from '../../utils/libraryLogic';
import { CatalogBookGrid } from './CatalogBookGrid';
import { CatalogBookTable } from './CatalogBookTable';
import { CatalogMetrics } from './CatalogMetrics';
import { CatalogListSkeleton } from './CatalogSkeleton';
import { CatalogToolbar } from './CatalogToolbar';

interface CatalogViewProps {
  onOpenAddBook: () => void;
  onSelectBook: (book: Book) => void;
  onEditBook: (book: Book) => void;
  onLendBook: (book: Book) => void;
}

export function CatalogView({
  onOpenAddBook,
  onSelectBook,
  onEditBook,
  onLendBook,
}: CatalogViewProps) {
  const { t } = useI18n();
  const {
    books,
    genres,
    lendings,
    selectedGenre,
    stockFilter,
    sortBy,
    sortOrder,
    searchQuery,
    isLoading,
    setSelectedGenre,
    setStockFilter,
    toggleLowStockFilter,
    jumpToActiveLoans,
    setSort,
    setSearchQuery,
    resetFilters,
  } = useLibraryStore(
    useShallow((s) => ({
      books: s.books,
      genres: s.genres,
      lendings: s.lendings,
      selectedGenre: s.selectedGenre,
      stockFilter: s.stockFilter,
      sortBy: s.sortBy,
      sortOrder: s.sortOrder,
      searchQuery: s.searchQuery,
      isLoading: s.isLoading,
      setSelectedGenre: s.setSelectedGenre,
      setStockFilter: s.setStockFilter,
      toggleLowStockFilter: s.toggleLowStockFilter,
      jumpToActiveLoans: s.jumpToActiveLoans,
      setSort: s.setSort,
      setSearchQuery: s.setSearchQuery,
      resetFilters: s.resetFilters,
    }))
  );

  const visibleBooks = useMemo(
    () =>
      filterAndSortBooks(books, {
        genre: selectedGenre,
        stockFilter,
        sortBy,
        sortOrder,
        search: searchQuery,
      }),
    [books, selectedGenre, stockFilter, sortBy, sortOrder, searchQuery]
  );

  const stats = useMemo(() => computeCatalogStats(books, lendings), [books, lendings]);
  const hasAnyBooks = books.length > 0;

  const sortSummaryText =
    sortBy === 'title'
      ? sortOrder === 'asc'
        ? t.catalog.sortSummary.titleAsc
        : t.catalog.sortSummary.titleDesc
      : sortOrder === 'desc'
        ? t.catalog.sortSummary.stockDesc
        : t.catalog.sortSummary.stockAsc;

  return (
    <div className="catalog-shell">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
          {t.catalog.heading}
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          {t.catalog.subheading}
        </p>
      </div>

      <CatalogMetrics
        stats={stats}
        stockFilter={stockFilter}
        isLoading={isLoading}
        onClearStockFilter={() => setStockFilter('all')}
        onJumpToActiveLoans={jumpToActiveLoans}
        onToggleLowStockFilter={toggleLowStockFilter}
      />

      <CatalogToolbar
        genres={genres}
        selectedGenre={selectedGenre}
        stockFilter={stockFilter}
        sortBy={sortBy}
        sortOrder={sortOrder}
        searchQuery={searchQuery}
        isLoading={isLoading}
        onGenreChange={setSelectedGenre}
        onSortChange={setSort}
        onSearchChange={setSearchQuery}
        onResetFilters={resetFilters}
      />

      <div
        className={
          !isLoading && (!hasAnyBooks || visibleBooks.length === 0)
            ? 'bg-white dark:bg-surface-dark border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden'
            : 'md:bg-white md:dark:bg-surface-dark md:border md:border-slate-200 md:dark:border-slate-800 md:rounded-lg md:overflow-hidden'
        }
      >
        {isLoading ? (
          <CatalogListSkeleton />
        ) : !hasAnyBooks ? (
          <div className="px-6 py-14 text-center">
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-50">
              {t.catalog.emptyShelfTitle}
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto">
              {t.catalog.emptyShelfBody}
            </p>
            <motion.button
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={onOpenAddBook}
              className="mt-5 inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-accent dark:bg-blue-600 rounded-md hover:bg-accent-hover dark:hover:bg-blue-500 whitespace-nowrap"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              {t.catalog.addFirstBook}
            </motion.button>
          </div>
        ) : visibleBooks.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-50">
              {t.catalog.noMatchesTitle}
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              {t.catalog.noMatchesBody}
            </p>
            <button
              type="button"
              onClick={resetFilters}
              className="mt-4 inline-flex items-center px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap"
            >
              {t.catalog.clearAllFilters}
            </button>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
          >
            <CatalogBookGrid
              books={visibleBooks}
              onSelectBook={onSelectBook}
              onEditBook={onEditBook}
              onLendBook={onLendBook}
            />
            <CatalogBookTable
              books={visibleBooks}
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSortChange={setSort}
              onSelectBook={onSelectBook}
              onEditBook={onEditBook}
              onLendBook={onLendBook}
            />
          </motion.div>
        )}
      </div>

      {isLoading && <Skeleton tone="subtle" className="h-4 w-64" />}
      <p
        aria-live="polite"
        className={
          !isLoading && visibleBooks.length > 0
            ? 'text-xs text-slate-500 dark:text-slate-400'
            : 'sr-only'
        }
      >
        {!isLoading && visibleBooks.length > 0
          ? t.catalog.summaryLine({
              count: visibleBooks.length,
              genre: selectedGenre !== ALL_GENRES_FILTER ? selectedGenre : null,
              lowOnly: stockFilter === 'low',
              sortText: sortSummaryText,
            })
          : !isLoading && hasAnyBooks
            ? t.catalog.noMatchesTitle
            : ''}
      </p>
    </div>
  );
}
