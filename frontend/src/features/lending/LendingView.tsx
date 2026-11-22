import { useMemo, useRef, useState, type FormEvent } from 'react';
import { ArrowDown } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import type { Book } from '@shared/library';
import { AnimatedNumber } from '../../components/ui/AnimatedNumber';
import { CalendarDatePicker } from '../../components/ui/CalendarDatePicker';
import { useLocalTodayIso } from '../../hooks/useLocalTodayIso';
import { ApiClientError } from '../../services/api';
import type { LendingDraft } from '../../store/useLibraryStore';
import { useI18n } from '../../store/useLocaleStore';
import { validateLendingForm } from '../../utils/libraryLogic';
import { BorrowerTextField } from './BorrowerTextField';
import { LendingViewSkeleton } from './LendingSkeleton';
import { SelectedBooks } from './SelectedBooks';
import { ShelfPicker } from './ShelfPicker';

interface LendingViewProps {
  books: Book[];
  genres: string[];
  draft: LendingDraft;
  isLoading: boolean;
  isSubmitting: boolean;
  onAddBook: (bookId: string) => void;
  onUpdateQuantity: (bookId: string, quantity: number) => void;
  onRemoveItem: (bookId: string) => void;
  onChangeField: (
    field: 'borrowerName' | 'borrowerPhone' | 'dueDate',
    value: string
  ) => void;
  onResetDraft: () => void;
  onRequestPreview: () => Promise<void>;
}

export function LendingView({
  books,
  genres,
  draft,
  isLoading,
  isSubmitting,
  onAddBook,
  onUpdateQuantity,
  onRemoveItem,
  onChangeField,
  onResetDraft,
  onRequestPreview,
}: LendingViewProps) {
  const { locale, t } = useI18n();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [shakeCount, setShakeCount] = useState(0);
  const borrowerSectionRef = useRef<HTMLElement>(null);
  const selectedBooksRef = useRef<HTMLElement>(null);
  const submittingRef = useRef(false);
  const minDate = useLocalTodayIso();

  const bookMap = useMemo(() => new Map(books.map((b) => [b.id, b])), [books]);

  const resolvedItems = useMemo(
    () => draft.items.filter((item) => bookMap.has(item.bookId)),
    [draft.items, bookMap]
  );

  const totalCopiesSelected = resolvedItems.reduce((sum, item) => sum + item.quantity, 0);

  const clearFieldError = (key: string) => {
    setFormError(null);
    setFieldErrors((prev) => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleChangeField = (
    field: 'borrowerName' | 'borrowerPhone' | 'dueDate',
    value: string
  ) => {
    clearFieldError(field);
    onChangeField(field, value);
  };

  const handleAddBook = (bookId: string) => {
    clearFieldError('items');
    onAddBook(bookId);
  };

  const handleUpdateQuantity = (bookId: string, quantity: number) => {
    clearFieldError('items');
    onUpdateQuantity(bookId, quantity);
  };

  const handleRemoveItem = (bookId: string) => {
    clearFieldError('items');
    onRemoveItem(bookId);
  };

  const handleResetDraft = () => {
    clearFieldError('items');
    onResetDraft();
  };

  const handleJumpToBorrower = () => {
    borrowerSectionRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
    window.setTimeout(() => {
      document.getElementById('borrower-name-input')?.focus();
    }, 350);
  };

  const handleReviewSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isSubmitting || submittingRef.current) return;
    setFormError(null);

    const errors = validateLendingForm(draft, books, locale);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setShakeCount((c) => c + 1);
      if (errors.borrowerName) {
        document.getElementById('borrower-name-input')?.focus();
      } else if (errors.borrowerPhone) {
        document.getElementById('borrower-phone-input')?.focus();
      } else if (errors.dueDate) {
        document.getElementById('due-date-input')?.focus();
      } else if (errors.items) {
        selectedBooksRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
        requestAnimationFrame(() => {
          const alertEl = document.getElementById('lending-items-error');
          if (alertEl) {
            alertEl.focus();
          } else {
            document.getElementById('picker-search')?.focus();
          }
        });
      }
      return;
    }

    setFieldErrors({});
    submittingRef.current = true;
    try {
      await onRequestPreview();
    } catch (error) {
      setShakeCount((c) => c + 1);
      if (error instanceof ApiClientError) {
        setFormError(error.message);
        if (error.fieldErrors) {
          setFieldErrors(error.fieldErrors);
        }
      } else if (error instanceof Error && error.message.trim().length > 0) {
        setFormError(error.message);
      } else {
        setFormError(t.lending.previewFailedFallback);
      }
    } finally {
      submittingRef.current = false;
    }
  };

  const inputBase =
    'w-full h-11 px-3 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-accent dark:focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-accent/15 dark:focus:ring-blue-500/20 disabled:opacity-60 disabled:cursor-not-allowed';

  return (
    <div className="space-y-6 pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] lg:pb-0">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
          {t.lending.heading}
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          {t.lending.subheading}
        </p>
      </div>

      {isLoading ? (
        <LendingViewSkeleton />
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
          className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start"
        >
          {/* Left column: Selected Books + Available on Shelf */}
          <div className="lg:col-span-7 space-y-6">
            <SelectedBooks
              draft={draft}
              bookMap={bookMap}
              fieldErrors={fieldErrors}
              disabled={isSubmitting}
              sectionRef={selectedBooksRef}
              onResetDraft={handleResetDraft}
              onUpdateQuantity={handleUpdateQuantity}
              onRemoveItem={handleRemoveItem}
            />

            <ShelfPicker
              books={books}
              items={draft.items}
              genres={genres}
              onAddBook={handleAddBook}
              disabled={isSubmitting}
            />
          </div>

          {/* Right column: Borrower Details (sticky on desktop) */}
          <section
            ref={borrowerSectionRef}
            aria-label={t.lending.borrowerDetails}
            className="lg:col-span-5 lg:sticky lg:top-24 bg-white dark:bg-surface-dark border border-slate-200 dark:border-slate-800 rounded-lg p-6 scroll-mt-20"
          >
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-50">
              {t.lending.borrowerDetails}
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {t.lending.borrowerSubtitle}
            </p>

            <motion.form
              animate={
                shakeCount > 0
                  ? { x: shakeCount % 2 === 1 ? [-4, 4, -2, 2, 0] : [4, -4, 2, -2, 0] }
                  : undefined
              }
              transition={{ duration: 0.22 }}
              onSubmit={(e) => void handleReviewSubmit(e)}
              noValidate
              className="mt-5 space-y-4"
            >
              {formError && (
                <div
                  role="alert"
                  className="px-3.5 py-2.5 text-sm text-red-800 dark:text-red-200 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900 rounded-md"
                >
                  {formError}
                </div>
              )}

              <BorrowerTextField
                id="borrower-name-input"
                errorId="borrower-name-error"
                label={t.lending.borrowerName}
                type="text"
                value={draft.borrowerName}
                onChange={(value) => handleChangeField('borrowerName', value)}
                error={fieldErrors.borrowerName}
                placeholder={t.lending.borrowerNamePlaceholder}
                className={inputBase}
                disabled={isSubmitting}
                maxLength={120}
              />

              <BorrowerTextField
                id="borrower-phone-input"
                errorId="borrower-phone-error"
                label={t.lending.phoneNumber}
                type="tel"
                value={draft.borrowerPhone}
                onChange={(value) => handleChangeField('borrowerPhone', value)}
                error={fieldErrors.borrowerPhone}
                placeholder={t.lending.phonePlaceholder}
                className={`${inputBase} font-mono`}
                disabled={isSubmitting}
              />

              <div>
                <label
                  htmlFor="due-date-input"
                  className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                >
                  {t.lending.dueDate}{' '}
                  <span className="text-red-600 dark:text-red-400">*</span>
                </label>
                <CalendarDatePicker
                  id="due-date-input"
                  value={draft.dueDate}
                  onChange={(iso) => handleChangeField('dueDate', iso)}
                  minDate={minDate}
                  disabled={isSubmitting}
                  placeholder={t.lending.selectDueDate}
                  ariaLabel={t.lending.dueDate}
                  ariaInvalid={Boolean(fieldErrors.dueDate)}
                  ariaDescribedBy={fieldErrors.dueDate ? 'due-date-error' : undefined}
                />
                {fieldErrors.dueDate && (
                  <p
                    id="due-date-error"
                    className="mt-1 text-xs text-red-700 dark:text-red-400"
                  >
                    {fieldErrors.dueDate}
                  </p>
                )}
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-2 text-sm">
                <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                  <span>{t.lending.distinctTitles}</span>
                  <span className="font-mono tabular-nums font-medium text-slate-900 dark:text-slate-100">
                    <AnimatedNumber value={resolvedItems.length} />
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                  <span>{t.lending.totalCopiesToLend}</span>
                  <span className="font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-50">
                    <AnimatedNumber value={totalCopiesSelected} />
                  </span>
                </div>
              </div>

              <motion.button
                type="submit"
                whileTap={{ scale: 0.98 }}
                disabled={isSubmitting}
                className="w-full min-h-[44px] py-2.5 px-4 text-sm font-medium text-white bg-accent dark:bg-blue-600 rounded-md hover:bg-accent-hover dark:hover:bg-blue-500 disabled:opacity-50 transition-colors whitespace-nowrap"
              >
                {isSubmitting ? t.lending.preparingSummary : t.lending.reviewCheckout}
              </motion.button>
            </motion.form>
          </section>
        </motion.div>
      )}

      {/* Mobile Quick-Jump Bar above bottom tab bar when books are selected */}
      <AnimatePresence>
        {!isLoading && resolvedItems.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 18 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            className="lg:hidden fixed inset-x-4 bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] z-20 flex items-center justify-between gap-3 px-4 py-2.5 rounded-lg bg-accent dark:bg-blue-600 text-white shadow-lg"
          >
            <div className="text-xs font-mono tabular-nums">
              {t.lending.quickJumpSummary(resolvedItems.length, totalCopiesSelected)}
            </div>
            <button
              type="button"
              onClick={handleJumpToBorrower}
              className="inline-flex items-center gap-1.5 min-h-[36px] px-3 rounded-md bg-white/15 hover:bg-white/25 text-xs font-medium whitespace-nowrap"
            >
              <span>{t.lending.borrowerDetails}</span>
              <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
