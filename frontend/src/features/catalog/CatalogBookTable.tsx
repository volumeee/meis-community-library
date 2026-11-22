import { ArrowDown, ArrowUpDown, Pencil } from 'lucide-react';
import { motion } from 'motion/react';
import type { Book, SortField, SortOrder } from '@shared/library';
import { useI18n } from '../../store/useLocaleStore';
import { BookCover } from './BookCover';
import { getStockStatus } from './catalogHelpers';

interface CatalogBookTableProps {
  books: Book[];
  sortBy: SortField;
  sortOrder: SortOrder;
  onSortChange: (sortBy: SortField, sortOrder: SortOrder) => void;
  onSelectBook: (book: Book) => void;
  onEditBook: (book: Book) => void;
  onLendBook: (book: Book) => void;
}

export function CatalogBookTable({
  books,
  sortBy,
  sortOrder,
  onSortChange,
  onSelectBook,
  onEditBook,
  onLendBook,
}: CatalogBookTableProps) {
  const { t } = useI18n();

  const toggleColumnSort = (field: SortField) => {
    if (sortBy === field) {
      onSortChange(field, sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      onSortChange(field, field === 'stock' ? 'desc' : 'asc');
    }
  };

  const renderSortIcon = (field: SortField) => {
    if (sortBy !== field) {
      return (
        <ArrowUpDown
          className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400"
          aria-hidden="true"
        />
      );
    }
    return (
      <motion.span
        animate={{ rotate: sortOrder === 'asc' ? 180 : 0 }}
        transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
        className="inline-flex"
      >
        <ArrowDown
          className="h-3.5 w-3.5 text-accent dark:text-blue-400"
          aria-hidden="true"
        />
      </motion.span>
    );
  };

  const getAriaSort = (field: SortField): 'ascending' | 'descending' | 'none' => {
    if (sortBy !== field) return 'none';
    return sortOrder === 'asc' ? 'ascending' : 'descending';
  };

  return (
    <div className="hidden md:block overflow-x-auto">
      <table
        className="catalog-table w-full text-left border-collapse"
        data-testid="catalog-table"
      >
        <colgroup>
          <col className="w-[38%]" />
          <col className="w-[15%]" />
          <col className="w-[21%]" />
          <col className="w-[12%]" />
          <col className="w-[14%]" />
        </colgroup>
        <thead>
          <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 text-xs font-semibold text-slate-600 dark:text-slate-400">
            <th
              scope="col"
              aria-sort={getAriaSort('title')}
              className="whitespace-nowrap"
            >
              <button
                type="button"
                onClick={() => toggleColumnSort('title')}
                className="inline-flex items-center gap-1.5 hover:text-slate-900 dark:hover:text-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent dark:focus-visible:outline-blue-400"
              >
                <span>{t.catalog.colTitleAuthor}</span>
                {renderSortIcon('title')}
              </button>
            </th>
            <th scope="col" className="whitespace-nowrap">
              {t.catalog.colGenre}
            </th>
            <th scope="col" className="whitespace-nowrap">
              {t.catalog.colYearIsbn}
            </th>
            <th
              scope="col"
              aria-sort={getAriaSort('stock')}
              className="text-right whitespace-nowrap"
            >
              <button
                type="button"
                onClick={() => toggleColumnSort('stock')}
                className="inline-flex items-center gap-1.5 ml-auto hover:text-slate-900 dark:hover:text-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent dark:focus-visible:outline-blue-400"
              >
                <span>{t.catalog.colStock}</span>
                {renderSortIcon('stock')}
              </button>
            </th>
            <th scope="col" className="text-right whitespace-nowrap">
              {t.catalog.colActions}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-sm">
          {books.map((book) => {
            const { statusLabel, statusClass } = getStockStatus(book.stock, t.catalog);

            return (
              <tr
                key={book.id}
                onClick={() => onSelectBook(book)}
                className="group cursor-pointer hover:bg-slate-50/90 dark:hover:bg-slate-800/40 transition-colors"
              >
                <td>
                  <div className="flex items-center gap-3.5 min-w-0">
                    <BookCover
                      src={book.coverImage}
                      title={book.title}
                      author={book.author}
                      genre={book.genre}
                      size="sm"
                    />
                    <div className="min-w-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectBook(book);
                        }}
                        aria-label={t.catalog.viewDetailsAria(book.title)}
                        className="text-left font-medium text-slate-900 dark:text-slate-100 group-hover:text-accent dark:group-hover:text-blue-400 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent dark:focus-visible:outline-blue-400 rounded"
                      >
                        {book.title}
                      </button>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {book.author}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="max-w-[160px] truncate text-slate-700 dark:text-slate-300 whitespace-nowrap">
                  {book.genre}
                </td>
                <td>
                  <div className="text-xs text-slate-600 dark:text-slate-400 font-mono tabular-nums">
                    {book.publishedYear ?? '—'}
                    {book.isbn ? (
                      <span className="text-slate-500 dark:text-slate-400">
                        {' '}
                        · {book.isbn}
                      </span>
                    ) : null}
                  </div>
                </td>
                <td className="text-right whitespace-nowrap">
                  <div className="font-mono font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                    {book.stock}
                  </div>
                  <div className={`text-xs font-medium ${statusClass}`}>
                    {statusLabel}
                  </div>
                </td>
                <td
                  className="text-right whitespace-nowrap"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="inline-flex items-center justify-end gap-1.5">
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.96 }}
                      disabled={book.stock === 0}
                      onClick={() => onLendBook(book)}
                      aria-label={t.catalog.lendBookAria(book.title)}
                      className="px-3 py-1.5 text-xs font-medium rounded-md border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                    >
                      {t.catalog.lendAction}
                    </motion.button>
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.92 }}
                      onClick={() => onEditBook(book)}
                      aria-label={t.catalog.editBookAria(book.title)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-500 dark:text-slate-400 hover:text-accent dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      <Pencil className="h-4 w-4" aria-hidden="true" />
                    </motion.button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
