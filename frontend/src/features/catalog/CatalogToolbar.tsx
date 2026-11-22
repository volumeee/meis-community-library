import { useMemo, useRef } from 'react';
import { Search, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import type { SortField, SortOrder } from '@shared/library';
import { CustomSelect, type SelectOption } from '../../components/ui/CustomSelect';
import { useI18n } from '../../store/useLocaleStore';
import { ALL_GENRES_FILTER, type StockFilter } from '../../utils/libraryLogic';

interface CatalogToolbarProps {
  genres: string[];
  selectedGenre: string;
  stockFilter: StockFilter;
  sortBy: SortField;
  sortOrder: SortOrder;
  searchQuery: string;
  isLoading: boolean;
  onGenreChange: (genre: string) => void;
  onSortChange: (sortBy: SortField, sortOrder: SortOrder) => void;
  onSearchChange: (value: string) => void;
  onResetFilters: () => void;
}

export function CatalogToolbar({
  genres,
  selectedGenre,
  stockFilter,
  sortBy,
  sortOrder,
  searchQuery,
  isLoading,
  onGenreChange,
  onSortChange,
  onSearchChange,
  onResetFilters,
}: CatalogToolbarProps) {
  const { t } = useI18n();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const sortSelectValue = `${sortBy}:${sortOrder}`;

  const genreSelectOptions = useMemo<SelectOption[]>(
    () => [
      { value: ALL_GENRES_FILTER, label: t.catalog.allGenres },
      ...genres.map((genre) => ({ value: genre, label: genre })),
    ],
    [genres, t.catalog.allGenres]
  );

  const sortSelectOptions = useMemo<SelectOption[]>(
    () => [
      { value: 'title:asc', label: t.catalog.sortTitleAsc },
      { value: 'title:desc', label: t.catalog.sortTitleDesc },
      { value: 'stock:desc', label: t.catalog.sortStockDesc },
      { value: 'stock:asc', label: t.catalog.sortStockAsc },
    ],
    [
      t.catalog.sortTitleAsc,
      t.catalog.sortTitleDesc,
      t.catalog.sortStockDesc,
      t.catalog.sortStockAsc,
    ]
  );

  const handleSortSelect = (value: string) => {
    const [field, order] = value.split(':') as [SortField, SortOrder];
    onSortChange(field, order);
  };

  const hasActiveFilters =
    selectedGenre !== ALL_GENRES_FILTER ||
    stockFilter === 'low' ||
    searchQuery.trim().length > 0;

  return (
    <section aria-label={t.catalog.filtersAriaLabel} className="catalog-toolbar">
      <div className="relative min-w-0">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 dark:text-slate-400"
          aria-hidden="true"
        />
        <label htmlFor="catalog-search" className="sr-only">
          {t.catalog.searchLabel}
        </label>
        <input
          ref={searchInputRef}
          id="catalog-search"
          type="text"
          disabled={isLoading}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={t.catalog.searchPlaceholder}
          className="w-full h-11 pl-9 pr-10 bg-white dark:bg-surface-dark border border-slate-200 dark:border-slate-800 rounded-md text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 disabled:opacity-60 focus:border-accent dark:focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-accent/15 dark:focus:ring-blue-500/20"
        />
        <AnimatePresence>
          {searchQuery.length > 0 && (
            <motion.button
              type="button"
              disabled={isLoading}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.12 }}
              onClick={() => {
                onSearchChange('');
                searchInputRef.current?.focus();
              }}
              aria-label={t.catalog.clearSearch}
              className="absolute right-1 top-1/2 -translate-y-1/2 inline-flex h-9 w-9 items-center justify-center rounded text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-40"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      <div className="catalog-toolbar-controls">
        <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2 min-w-0">
          <label
            htmlFor="genre-filter"
            className="text-xs font-medium text-slate-600 dark:text-slate-400 whitespace-nowrap"
          >
            {t.catalog.genreLabel}
          </label>
          <CustomSelect
            id="genre-filter"
            disabled={isLoading}
            value={selectedGenre}
            options={genreSelectOptions}
            onChange={onGenreChange}
            ariaLabel={t.catalog.genreLabel}
            searchable={genres.length > 6}
            searchPlaceholder={t.catalog.searchGenrePlaceholder}
            emptyText={t.catalog.noGenresFound}
            className="w-full sm:w-44"
            minMenuWidth={200}
          />
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2 min-w-0">
          <label
            htmlFor="sort-select"
            className="text-xs font-medium text-slate-600 dark:text-slate-400 whitespace-nowrap"
          >
            {t.catalog.sortByLabel}
          </label>
          <CustomSelect
            id="sort-select"
            disabled={isLoading}
            value={sortSelectValue}
            options={sortSelectOptions}
            onChange={handleSortSelect}
            ariaLabel={t.catalog.sortByLabel}
            className="w-full sm:w-48"
            minMenuWidth={200}
          />
        </div>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={onResetFilters}
            className="col-span-2 sm:col-span-1 h-11 px-3.5 text-xs font-medium text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 bg-white dark:bg-surface-dark rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
          >
            {t.catalog.clearAllFilters}
          </button>
        )}
      </div>
    </section>
  );
}
