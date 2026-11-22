import { BookOpen, Pencil, Trash2, X } from 'lucide-react';
import { motion } from 'motion/react';
import { useI18n } from '../../store/useLocaleStore';
import type { Book, LendingTransaction } from '@shared/library';
import { formatShortDate } from '../../utils/libraryLogic';
import { AdaptiveModal } from '../../components/ui/AdaptiveModal';
import { BookCover } from './BookCover';

interface BookDetailModalProps {
  book: Book;
  lendings: LendingTransaction[];
  onClose: () => void;
  onEdit: (book: Book) => void;
  onLend: (book: Book) => void;
  onRequestDelete: (book: Book) => void;
}

export function BookDetailModal({
  book,
  lendings,
  onClose,
  onEdit,
  onLend,
  onRequestDelete,
}: BookDetailModalProps) {
  const { locale, t } = useI18n();

  const statusLabel =
    book.stock === 0
      ? t.catalog.statusOut
      : book.stock <= 2
        ? t.catalog.statusLow
        : t.catalog.statusAvailableDetail;

  const statusColorClass =
    book.stock === 0
      ? 'text-red-700 dark:text-red-400'
      : book.stock <= 2
        ? 'text-amber-700 dark:text-amber-400'
        : 'text-emerald-700 dark:text-emerald-400';

  const activeLoansForBook = lendings.filter(
    (tx) => tx.status === 'Active' && tx.items.some((item) => item.bookId === book.id)
  );
  const copiesCheckedOut = activeLoansForBook.reduce((sum, tx) => {
    const matched = tx.items.find((item) => item.bookId === book.id);
    return sum + (matched ? matched.quantity : 0);
  }, 0);

  const details: Array<{ label: string; value: string; mono?: boolean }> = [
    { label: t.bookDetail.genre, value: book.genre },
    {
      label: t.bookDetail.publishedYear,
      value: book.publishedYear ? String(book.publishedYear) : '—',
      mono: true,
    },
    { label: t.bookDetail.isbn, value: book.isbn || '—', mono: true },
    { label: t.bookDetail.publisher, value: book.publisher || '—' },
    {
      label: t.bookDetail.pages,
      value: book.pages ? t.bookDetail.pagesValue(book.pages) : '—',
      mono: true,
    },
    { label: t.bookDetail.language, value: book.language || '—' },
    {
      label: t.bookDetail.shelfLocation,
      value: book.shelfLocation || t.bookDetail.unassigned,
    },
    {
      label: t.bookDetail.lastUpdated,
      value: formatShortDate(book.updatedAt, locale),
      mono: true,
    },
  ];

  return (
    <AdaptiveModal
      ariaLabelledBy="book-detail-title"
      maxWidthClass="sm:max-w-2xl"
      onClose={onClose}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 sm:px-6 py-3.5 sm:py-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {t.bookDetail.kicker}
          </p>
          <h2
            id="book-detail-title"
            className="font-display text-lg font-semibold text-slate-900 dark:text-slate-50 truncate"
          >
            {book.title}
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={t.bookDetail.closeAria}
          className="inline-flex h-11 w-11 -mr-2 items-center justify-center rounded-md text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      {/* Scrollable Body */}
      <div
        data-testid="book-detail-modal"
        className="flex-1 overflow-y-auto px-5 sm:px-6 py-5 space-y-6"
      >
        {/* Top Hero Split: Cover Photo + Primary Summary */}
        <div className="flex flex-col sm:flex-row gap-5 sm:gap-6 items-center sm:items-start">
          <BookCover
            src={book.coverImage}
            title={book.title}
            author={book.author}
            genre={book.genre}
            size="lg"
            className="shadow-md"
          />

          <div className="flex-1 min-w-0 w-full space-y-4">
            <div className="text-center sm:text-left">
              <h3 className="font-display text-xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
                {book.title}
              </h3>
              <p className="mt-1 text-sm font-medium text-slate-700 dark:text-slate-300">
                {book.author}
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                <span>{book.genre}</span>
                {book.publishedYear ? (
                  <>
                    {' '}
                    <span aria-hidden="true">·</span>{' '}
                    <span className="font-mono tabular-nums">{book.publishedYear}</span>
                  </>
                ) : null}
                {book.language ? (
                  <>
                    {' '}
                    <span aria-hidden="true">·</span> <span>{book.language}</span>
                  </>
                ) : null}
              </p>
            </div>

            {/* Availability & Shelf Strip */}
            <div className="grid grid-cols-2 gap-3 p-3.5 rounded-lg bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {t.bookDetail.shelfStock}
                </p>
                <p
                  data-testid="book-detail-stock"
                  className="mt-0.5 font-mono text-lg font-semibold text-slate-900 dark:text-slate-50 tabular-nums"
                >
                  {book.stock}{' '}
                  <span className="font-sans text-xs font-normal text-slate-500 dark:text-slate-400">
                    {t.bookDetail.copyUnit(book.stock)}
                  </span>
                </p>
                <p className={`text-xs font-medium mt-0.5 ${statusColorClass}`}>
                  {statusLabel}
                </p>
              </div>
              <div className="border-l border-slate-200 dark:border-slate-800 pl-3">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {t.bookDetail.shelfLocation}
                </p>
                <p className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">
                  {book.shelfLocation || t.bookDetail.notSet}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-mono tabular-nums">
                  {copiesCheckedOut > 0
                    ? t.bookDetail.copiesOutOnLoan(copiesCheckedOut)
                    : t.bookDetail.noCopiesOut}
                </p>
              </div>
            </div>

            {/* Synopsis */}
            <div>
              <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {t.bookDetail.aboutBook}
              </h4>
              {book.description ? (
                <p
                  data-testid="book-detail-description"
                  className="mt-1.5 text-sm leading-relaxed text-slate-700 dark:text-slate-300"
                >
                  {book.description}
                </p>
              ) : (
                <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400 italic">
                  {t.bookDetail.noSynopsis}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Bibliographic Information Grid */}
        <section
          aria-label={t.bookDetail.bibliographicAria}
          className="pt-5 border-t border-slate-200 dark:border-slate-800"
        >
          <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-3">
            {t.bookDetail.catalogInfo}
          </h4>
          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-3.5 text-sm">
            {details.map((item) => (
              <div key={item.label} className="min-w-0">
                <dt className="text-xs text-slate-500 dark:text-slate-400">
                  {item.label}
                </dt>
                <dd
                  className={`mt-0.5 text-slate-900 dark:text-slate-100 font-medium break-words ${
                    item.mono ? 'font-mono text-xs tabular-nums pt-0.5' : 'text-sm'
                  }`}
                >
                  {item.value}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        {/* Active Borrowers Context (only if copies are currently out) */}
        {activeLoansForBook.length > 0 && (
          <section
            aria-label={t.bookDetail.activeLoansAria}
            className="pt-5 border-t border-slate-200 dark:border-slate-800"
          >
            <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2.5">
              {t.bookDetail.currentlyCheckedOut(activeLoansForBook.length)}
            </h4>
            <ul className="divide-y divide-slate-200 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-md bg-slate-50/50 dark:bg-slate-900/40">
              {activeLoansForBook.map((tx) => {
                const matched = tx.items.find((item) => item.bookId === book.id);
                return (
                  <li
                    key={tx.id}
                    className="px-3.5 py-2.5 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0">
                      <span className="font-medium text-slate-900 dark:text-slate-100">
                        {tx.borrowerName}
                      </span>
                      <span
                        className="text-slate-500 dark:text-slate-400"
                        aria-hidden="true"
                      >
                        {' '}
                        ·{' '}
                      </span>
                      <span className="font-mono text-slate-500 dark:text-slate-400">
                        {tx.referenceCode}
                      </span>
                    </div>
                    <div className="font-mono tabular-nums text-slate-600 dark:text-slate-300 shrink-0">
                      {matched?.quantity ?? 1}× · {t.history.duePrefix}{' '}
                      {formatShortDate(tx.dueDate, locale)}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {/* Danger Zone: Remove Book from Catalog */}
        <section
          aria-label={t.bookDetail.removeZoneAria}
          className="pt-5 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
        >
          <div className="min-w-0">
            <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {t.bookDetail.removeZoneTitle}
            </h4>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              {t.bookDetail.removeZoneBody}
            </p>
          </div>
          <motion.button
            type="button"
            whileTap={{ scale: 0.97 }}
            onClick={() => onRequestDelete(book)}
            className="inline-flex items-center justify-center gap-1.5 min-h-[40px] px-3.5 py-2 text-xs font-medium text-red-700 dark:text-red-400 bg-white dark:bg-slate-900 border border-red-200 dark:border-red-900/80 hover:bg-red-50 dark:hover:bg-red-950/50 hover:border-red-300 dark:hover:border-red-800 rounded-md transition-colors whitespace-nowrap shrink-0 self-start sm:self-center"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{t.bookDetail.removeBook}</span>
          </motion.button>
        </section>
      </div>

      {/* Footer Actions */}
      <div className="grid grid-cols-2 sm:flex sm:items-center sm:justify-end gap-2.5 px-5 sm:px-6 py-4 bg-slate-50/80 dark:bg-slate-900/70 border-t border-slate-200 dark:border-slate-800 shrink-0">
        <motion.button
          type="button"
          whileTap={{ scale: 0.97 }}
          onClick={() => onEdit(book)}
          className="inline-flex items-center justify-center gap-1.5 min-h-[44px] px-4 py-2 text-sm font-medium text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
        >
          <Pencil className="h-4 w-4" aria-hidden="true" />
          <span>{t.bookDetail.editDetails}</span>
        </motion.button>

        <motion.button
          type="button"
          whileTap={book.stock === 0 ? undefined : { scale: 0.97 }}
          disabled={book.stock === 0}
          onClick={() => onLend(book)}
          className="inline-flex items-center justify-center gap-1.5 min-h-[44px] px-5 py-2 text-sm font-medium text-white bg-accent dark:bg-blue-600 rounded-md hover:bg-accent-hover dark:hover:bg-blue-500 disabled:opacity-45 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
        >
          <BookOpen className="h-4 w-4" aria-hidden="true" />
          <span>
            {book.stock === 0 ? t.bookDetail.outOfStock : t.bookDetail.lendBook}
          </span>
        </motion.button>
      </div>
    </AdaptiveModal>
  );
}
