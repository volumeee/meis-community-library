import type { Ref } from 'react';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import type { LendingDraft } from '../../store/useLibraryStore';
import { useI18n } from '../../store/useLocaleStore';
import type { Book } from '@shared/library';
import { MAX_LENDING_QUANTITY } from '../../utils/libraryLogic';
import { AnimatedNumber } from '../../components/ui/AnimatedNumber';

interface SelectedBooksProps {
  draft: LendingDraft;
  bookMap: Map<string, Book>;
  fieldErrors: Record<string, string>;
  disabled?: boolean;
  sectionRef?: Ref<HTMLElement>;
  onResetDraft: () => void;
  onUpdateQuantity: (bookId: string, quantity: number) => void;
  onRemoveItem: (bookId: string) => void;
}

export function SelectedBooks({
  draft,
  bookMap,
  fieldErrors,
  disabled = false,
  sectionRef,
  onResetDraft,
  onUpdateQuantity,
  onRemoveItem,
}: SelectedBooksProps) {
  const { t } = useI18n();
  const resolvedItems = draft.items.flatMap((item) => {
    const book = bookMap.get(item.bookId);
    return book ? [{ item, book }] : [];
  });
  return (
    <section
      ref={sectionRef}
      aria-label={t.lending.selectedBooksAria}
      className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden scroll-mt-20"
    >
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-slate-800">
        <h2 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-50">
          {t.lending.selectedBooksTitle} (
          <span className="font-mono tabular-nums">{resolvedItems.length}</span>)
        </h2>
        {resolvedItems.length > 0 && (
          <button
            type="button"
            disabled={disabled}
            onClick={onResetDraft}
            className="text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {t.lending.clearAll}
          </button>
        )}
      </div>

      {fieldErrors.items && (
        <div
          id="lending-items-error"
          role="alert"
          tabIndex={-1}
          className="mx-5 mt-4 px-3.5 py-2.5 text-xs text-red-800 dark:text-red-200 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600/40"
        >
          {fieldErrors.items}
        </div>
      )}

      {resolvedItems.length === 0 ? (
        <div className="px-5 py-8 text-center">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {t.lending.emptyDraftBody}
          </p>
        </div>
      ) : (
        <div className="divide-y divide-slate-200 dark:divide-slate-800">
          <AnimatePresence initial={false}>
            {resolvedItems.map(({ item, book }) => {
              const remaining = Math.max(0, book.stock - item.quantity);
              const remainingClass =
                remaining === 0
                  ? 'text-red-700 dark:text-red-400 font-medium'
                  : remaining <= 2
                    ? 'text-amber-700 dark:text-amber-400 font-medium'
                    : 'text-slate-500 dark:text-slate-400';

              return (
                <motion.div
                  key={item.bookId}
                  layout
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                  data-testid="lending-selected-item"
                  className="px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                      {book.title}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {book.author} <span aria-hidden="true">·</span> {book.genre}{' '}
                      <span aria-hidden="true">·</span>{' '}
                      <span className={`font-mono tabular-nums ${remainingClass}`}>
                        {t.lending.onShelfLeftAfter(book.stock, remaining)}
                      </span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                    <div className="inline-flex items-center border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900">
                      <motion.button
                        type="button"
                        whileTap={
                          disabled || item.quantity <= 1 ? undefined : { scale: 0.9 }
                        }
                        onClick={() => onUpdateQuantity(item.bookId, item.quantity - 1)}
                        disabled={disabled || item.quantity <= 1}
                        aria-label={t.lending.decreaseQtyAria(book.title)}
                        className="h-11 w-11 sm:h-9 sm:w-9 inline-flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-35 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent dark:focus-visible:ring-blue-400"
                      >
                        <Minus className="h-3.5 w-3.5" aria-hidden="true" />
                      </motion.button>
                      <div className="w-12 h-11 sm:h-9 flex items-center justify-center border-x border-slate-200 dark:border-slate-700 font-mono text-sm font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                        <AnimatedNumber value={item.quantity} />
                      </div>
                      <motion.button
                        type="button"
                        whileTap={
                          disabled ||
                          item.quantity >= Math.min(book.stock, MAX_LENDING_QUANTITY)
                            ? undefined
                            : { scale: 0.9 }
                        }
                        onClick={() => onUpdateQuantity(item.bookId, item.quantity + 1)}
                        disabled={
                          disabled ||
                          item.quantity >= Math.min(book.stock, MAX_LENDING_QUANTITY)
                        }
                        aria-label={t.lending.increaseQtyAria(book.title)}
                        className="h-11 w-11 sm:h-9 sm:w-9 inline-flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-35 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent dark:focus-visible:ring-blue-400"
                      >
                        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                      </motion.button>
                    </div>

                    <motion.button
                      type="button"
                      whileTap={disabled ? undefined : { scale: 0.92 }}
                      disabled={disabled}
                      onClick={() => onRemoveItem(item.bookId)}
                      aria-label={t.lending.removeFromListAria(book.title)}
                      className="h-11 w-11 sm:h-9 sm:w-9 inline-flex items-center justify-center rounded-md text-slate-500 dark:text-slate-400 hover:text-red-700 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 disabled:opacity-35 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </motion.button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </section>
  );
}
