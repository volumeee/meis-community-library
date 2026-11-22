import { useMemo, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { motion } from 'motion/react';
import type { Book } from '@shared/library';
import { CustomSelect, type SelectOption } from '../../components/ui/CustomSelect';
import type { LendingDraft } from '../../store/useLibraryStore';
import { useI18n } from '../../store/useLocaleStore';
import { ALL_GENRES_FILTER, MAX_LENDING_QUANTITY } from '../../utils/libraryLogic';

interface ShelfPickerProps {
  genres: string[];
  books: Book[];
  items: LendingDraft['items'];
  onAddBook: (bookId: string) => void;
  disabled?: boolean;
}

export function ShelfPicker({
  books,
  items,
  genres,
  onAddBook,
  disabled = false,
}: ShelfPickerProps) {
  const { t } = useI18n();
  const [pickerSearch, setPickerSearch] = useState('');
  const [pickerGenre, setPickerGenre] = useState(ALL_GENRES_FILTER);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const effectiveGenre =
    pickerGenre !== ALL_GENRES_FILTER && !genres.includes(pickerGenre)
      ? ALL_GENRES_FILTER
      : pickerGenre;

  const selectedQuantities = useMemo(
    () => new Map(items.map((item) => [item.bookId, item.quantity])),
    [items]
  );

  const genreOptions = useMemo<SelectOption[]>(
    () => [
      { value: ALL_GENRES_FILTER, label: t.catalog.allGenres },
      ...genres.map((g) => ({ value: g, label: g })),
    ],
    [genres, t.catalog.allGenres]
  );

  const availableBooks = useMemo(() => {
    const q = pickerSearch.trim().toLowerCase();
    return books.filter((book) => {
      if (effectiveGenre !== ALL_GENRES_FILTER && book.genre !== effectiveGenre) {
        return false;
      }
      if (
        q &&
        !book.title.toLowerCase().includes(q) &&
        !book.author.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [books, effectiveGenre, pickerSearch]);

  return (
    <section
      aria-label={t.lending.availableOnShelf}
      className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden"
    >
      <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center gap-3">
        <h2 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-50 whitespace-nowrap">
          {t.lending.availableOnShelf}
        </h2>
        <div className="flex-1 flex flex-col sm:flex-row gap-2 sm:justify-end">
          <div className="relative flex-1 sm:max-w-[220px]">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500 dark:text-slate-400"
              aria-hidden="true"
            />
            <label htmlFor="picker-search" className="sr-only">
              {t.lending.findBookLabel}
            </label>
            <input
              ref={searchInputRef}
              id="picker-search"
              type="text"
              disabled={disabled}
              value={pickerSearch}
              onChange={(e) => setPickerSearch(e.target.value)}
              placeholder={t.lending.findBookPlaceholder}
              className="w-full h-10 pl-8 pr-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-accent dark:focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-accent/15 dark:focus:ring-blue-500/20 disabled:opacity-60 disabled:cursor-not-allowed"
            />
            {pickerSearch.length > 0 && (
              <button
                type="button"
                disabled={disabled}
                onClick={() => {
                  setPickerSearch('');
                  searchInputRef.current?.focus();
                }}
                aria-label={t.lending.clearBookSearch}
                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 inline-flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-40"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            )}
          </div>
          <CustomSelect
            id="picker-genre"
            size="sm"
            value={effectiveGenre}
            options={genreOptions}
            onChange={setPickerGenre}
            disabled={disabled}
            ariaLabel={t.lending.filterGenreAria}
            searchable={genres.length > 6}
            searchPlaceholder={t.catalog.searchGenrePlaceholder}
            emptyText={t.catalog.noGenresFound}
            className="w-full sm:w-40"
            minMenuWidth={180}
          />
        </div>
      </div>

      <div className="max-h-[360px] overflow-y-auto divide-y divide-slate-200 dark:divide-slate-800">
        {availableBooks.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
            {t.lending.noSearchMatches}
          </div>
        ) : (
          availableBooks.map((book) => {
            const quantity = selectedQuantities.get(book.id);
            const isAdded = quantity !== undefined;
            const outOfStock = book.stock === 0;
            const isAtLimit =
              isAdded && quantity >= Math.min(book.stock, MAX_LENDING_QUANTITY);
            return (
              <div
                key={book.id}
                className="px-5 py-3 flex items-center justify-between gap-4 hover:bg-slate-50/70 dark:hover:bg-slate-800/40"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                    {book.title}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                    {book.author} <span aria-hidden="true">·</span> {book.genre}{' '}
                    <span aria-hidden="true">·</span>{' '}
                    <span
                      className={`font-mono tabular-nums ${
                        outOfStock
                          ? 'text-red-700 dark:text-red-400 font-medium'
                          : 'text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {t.lending.onShelfCount(book.stock)}
                    </span>
                  </p>
                </div>
                <motion.button
                  type="button"
                  whileTap={
                    disabled || outOfStock || isAtLimit ? undefined : { scale: 0.95 }
                  }
                  disabled={disabled || outOfStock || isAtLimit}
                  onClick={() => onAddBook(book.id)}
                  aria-label={t.lending.addToLendingAria(book.title)}
                  className={`min-h-[40px] sm:min-h-[34px] px-3.5 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 disabled:opacity-50 disabled:cursor-not-allowed ${
                    outOfStock
                      ? 'border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50 cursor-not-allowed'
                      : isAdded
                        ? 'border-accent dark:border-blue-500 text-accent dark:text-blue-400 bg-slate-50 dark:bg-blue-950/30 hover:bg-slate-100 dark:hover:bg-blue-950/50'
                        : 'border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {outOfStock
                    ? t.lending.outOfStock
                    : isAdded
                      ? t.lending.addAnother
                      : t.lending.add}
                </motion.button>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
