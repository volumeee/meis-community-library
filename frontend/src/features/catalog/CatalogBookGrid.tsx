import { motion } from 'motion/react';
import type { Book } from '@shared/library';
import { useI18n } from '../../store/useLocaleStore';
import { BookCover } from './BookCover';
import { getStockStatus } from './catalogHelpers';

interface CatalogBookGridProps {
  books: Book[];
  onSelectBook: (book: Book) => void;
  onEditBook: (book: Book) => void;
  onLendBook: (book: Book) => void;
}

export function CatalogBookGrid({
  books,
  onSelectBook,
  onEditBook,
  onLendBook,
}: CatalogBookGridProps) {
  const { t } = useI18n();

  return (
    <ul className="md:hidden catalog-book-grid" data-testid="catalog-mobile-list">
      {books.map((book) => {
        const { statusLabel, statusClass } = getStockStatus(book.stock, t.catalog);

        return (
          <li
            key={book.id}
            data-testid="catalog-mobile-card"
            onClick={() => onSelectBook(book)}
            className="catalog-book-card rounded-lg bg-white dark:bg-surface-dark border border-slate-200/90 dark:border-slate-800 cursor-pointer hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
          >
            <div className="flex items-start gap-3 min-w-0">
              <BookCover
                src={book.coverImage}
                title={book.title}
                author={book.author}
                genre={book.genre}
                size="sm"
              />
              <div className="min-w-0 flex-1">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectBook(book);
                  }}
                  aria-label={t.catalog.viewDetailsAria(book.title)}
                  className="text-left font-medium text-slate-900 dark:text-slate-50 text-sm leading-snug line-clamp-2 hover:text-accent dark:hover:text-blue-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent dark:focus-visible:outline-blue-400 rounded"
                >
                  {book.title}
                </button>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">
                  {book.author}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                  {book.genre}
                  {book.publishedYear ? (
                    <>
                      {' '}
                      <span aria-hidden="true">·</span>{' '}
                      <span className="font-mono tabular-nums">{book.publishedYear}</span>
                    </>
                  ) : null}
                </p>
              </div>
            </div>

            <div
              className="flex items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800/80"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="min-w-0">
                <div className="flex items-baseline gap-1.5">
                  <span className="font-mono text-sm font-semibold text-slate-900 dark:text-slate-50 tabular-nums">
                    {book.stock}
                  </span>
                  <span className={`text-xs font-medium truncate ${statusClass}`}>
                    {statusLabel}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.96 }}
                  disabled={book.stock === 0}
                  onClick={() => onLendBook(book)}
                  aria-label={t.catalog.lendBookAria(book.title)}
                  className="h-10 px-3.5 text-xs font-medium rounded-md border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 whitespace-nowrap"
                >
                  {t.catalog.lendAction}
                </motion.button>
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.96 }}
                  onClick={() => onEditBook(book)}
                  aria-label={t.catalog.editBookAria(book.title)}
                  className="h-10 px-3 text-xs font-medium rounded-md text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap"
                >
                  {t.catalog.editAction}
                </motion.button>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
