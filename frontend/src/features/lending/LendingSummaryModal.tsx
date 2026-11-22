import { useRef, useState } from 'react';
import { X } from 'lucide-react';
import { motion, useIsPresent } from 'motion/react';
import { useI18n } from '../../store/useLocaleStore';
import type { LendingPreview } from '@shared/library';
import { formatShortDate } from '../../utils/libraryLogic';
import { AdaptiveModal } from '../../components/ui/AdaptiveModal';

interface LendingSummaryModalProps {
  preview: LendingPreview;
  isSubmitting: boolean;
  onEdit: () => void;
  onConfirm: () => Promise<void>;
}

export function LendingSummaryModal({
  preview,
  isSubmitting,
  onEdit,
  onConfirm,
}: LendingSummaryModalProps) {
  const { locale, t } = useI18n();
  const isPresent = useIsPresent();
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [succeeded, setSucceeded] = useState(false);
  const confirmingRef = useRef(false);
  const isBusy = isSubmitting || succeeded || !isPresent;

  const handleClose = () => {
    if (isBusy || confirmingRef.current) return;
    onEdit();
  };

  const handleConfirm = async () => {
    if (isBusy || confirmingRef.current) return;
    confirmingRef.current = true;
    setConfirmError(null);
    let ok = false;
    try {
      await onConfirm();
      ok = true;
      setSucceeded(true);
    } catch (err) {
      setConfirmError(err instanceof Error ? err.message : t.toast.checkoutError);
    } finally {
      if (!ok) {
        confirmingRef.current = false;
      }
    }
  };

  return (
    <AdaptiveModal
      ariaLabelledBy="lending-summary-title"
      maxWidthClass="sm:max-w-2xl"
      onClose={handleClose}
    >
      <div className="flex items-center justify-between px-5 sm:px-6 py-3.5 sm:py-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
        <div>
          <h2
            id="lending-summary-title"
            className="font-display text-lg font-semibold text-slate-900 dark:text-slate-50"
          >
            {t.lendingSummary.title}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {t.lendingSummary.subtitle}
          </p>
        </div>
        <button
          type="button"
          disabled={isBusy}
          onClick={handleClose}
          aria-label={t.lendingSummary.closeAria}
          className="inline-flex h-11 w-11 -mr-2 items-center justify-center rounded-md text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-5 space-y-5">
        <dl className="grid grid-cols-1 sm:grid-cols-3 gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
          <div>
            <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {t.lendingSummary.borrower}
            </dt>
            <dd className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
              {preview.borrowerName}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {t.lendingSummary.phoneNumber}
            </dt>
            <dd className="mt-1 text-sm font-mono text-slate-900 dark:text-slate-100">
              {preview.borrowerPhone}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {t.lendingSummary.dueDate}
            </dt>
            <dd className="mt-1 text-sm font-mono tabular-nums text-slate-900 dark:text-slate-100">
              {formatShortDate(preview.dueDate, locale)}
            </dd>
          </div>
        </dl>

        <div>
          <h3 className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2.5">
            {t.lendingSummary.booksIncluded(preview.totalTitles, preview.totalCopies)}
          </h3>

          <div className="border border-slate-200 dark:border-slate-800 rounded-md overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/70 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-400">
                  <th scope="col" className="py-2.5 pl-4 pr-3">
                    {t.lendingSummary.colBookTitle}
                  </th>
                  <th scope="col" className="py-2.5 px-3 text-right">
                    {t.lendingSummary.colQty}
                  </th>
                  <th
                    scope="col"
                    className="py-2.5 pl-3 pr-4 text-right whitespace-nowrap"
                  >
                    {t.lendingSummary.colShelfStock}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {preview.items.map((item, idx) => (
                  <motion.tr
                    key={item.bookId}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.16,
                      delay: Math.min(idx * 0.035, 0.18),
                      ease: [0.16, 1, 0.3, 1],
                    }}
                  >
                    <td className="py-2.5 pl-4 pr-3">
                      <div className="font-medium text-slate-900 dark:text-slate-100">
                        {item.bookTitle}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {item.author} · {item.genre}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                      {item.quantity}
                    </td>
                    <td className="py-2.5 pl-3 pr-4 text-right font-mono tabular-nums text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      {item.availableStock} →{' '}
                      <span
                        className={`font-semibold ${
                          item.remainingStock === 0
                            ? 'text-red-700 dark:text-red-400'
                            : item.remainingStock <= 2
                              ? 'text-amber-700 dark:text-amber-400'
                              : 'text-slate-900 dark:text-slate-100'
                        }`}
                      >
                        {item.remainingStock}
                      </span>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {confirmError && (
          <div
            role="alert"
            className="px-3.5 py-2.5 text-xs text-red-800 dark:text-red-200 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900 rounded-md"
          >
            {confirmError}
          </div>
        )}

        <p className="text-xs text-slate-600 dark:text-slate-400">
          {t.lendingSummary.disclaimer}
        </p>
      </div>

      <div className="flex items-center justify-end gap-3 px-5 sm:px-6 py-4 bg-slate-50/80 dark:bg-slate-900/70 border-t border-slate-200 dark:border-slate-800 shrink-0">
        <button
          type="button"
          disabled={isBusy}
          onClick={handleClose}
          className="min-h-[44px] px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 whitespace-nowrap"
        >
          {t.lendingSummary.editDetails}
        </button>
        <motion.button
          type="button"
          data-autofocus="true"
          whileTap={{ scale: 0.97 }}
          disabled={isBusy}
          onClick={() => void handleConfirm()}
          className="min-h-[44px] px-5 py-2 text-sm font-medium text-white bg-accent dark:bg-blue-600 rounded-md hover:bg-accent-hover dark:hover:bg-blue-500 disabled:opacity-50 whitespace-nowrap"
        >
          {isSubmitting || succeeded
            ? t.lendingSummary.confirming
            : t.lendingSummary.confirmCheckout}
        </motion.button>
      </div>
    </AdaptiveModal>
  );
}
