import { useRef, useState } from 'react';
import { motion, useIsPresent } from 'motion/react';
import { useI18n } from '../../store/useLocaleStore';
import type { Book } from '@shared/library';
import { AdaptiveModal } from '../../components/ui/AdaptiveModal';

interface ConfirmDeleteModalProps {
  book: Book;
  isSubmitting: boolean;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
}

export function ConfirmDeleteModal({
  book,
  isSubmitting,
  onCancel,
  onConfirm,
}: ConfirmDeleteModalProps) {
  const { locale, t } = useI18n();
  const isPresent = useIsPresent();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [succeeded, setSucceeded] = useState(false);
  const submittingRef = useRef(false);
  const isBusy = isSubmitting || succeeded || !isPresent;

  const handleCancel = () => {
    if (isBusy || submittingRef.current) return;
    onCancel();
  };

  const handleConfirm = async () => {
    if (isBusy || submittingRef.current) return;
    submittingRef.current = true;
    setErrorMessage(null);
    let ok = false;
    try {
      await onConfirm();
      ok = true;
      setSucceeded(true);
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : locale === 'id'
            ? 'Buku belum berhasil dihapus. Silakan coba lagi.'
            : 'Could not remove this book. Please try again.'
      );
    } finally {
      if (!ok) {
        submittingRef.current = false;
      }
    }
  };

  return (
    <AdaptiveModal
      ariaLabelledBy="confirm-delete-title"
      maxWidthClass="sm:max-w-md"
      onClose={handleCancel}
    >
      <div className="p-5 sm:p-6">
        <h2
          id="confirm-delete-title"
          className="font-display text-lg font-semibold text-slate-900 dark:text-slate-50"
        >
          {t.confirmDelete.title(book.title)}
        </h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          {t.confirmDelete.bodyBefore}{' '}
          <span className="font-medium text-slate-900 dark:text-slate-100">
            &ldquo;{book.title}&rdquo;
          </span>{' '}
          {t.confirmDelete.bodyAfter(book.stock)}
        </p>
        {errorMessage && (
          <p role="alert" className="mt-3 text-sm text-red-700 dark:text-red-400">
            {errorMessage}
          </p>
        )}

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            data-autofocus="true"
            disabled={isBusy}
            onClick={handleCancel}
            className="min-h-[44px] px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 whitespace-nowrap"
          >
            {t.confirmDelete.cancel}
          </button>
          <motion.button
            type="button"
            whileTap={{ scale: 0.97 }}
            disabled={isBusy}
            onClick={() => void handleConfirm()}
            className="min-h-[44px] px-4 py-2 text-sm font-medium text-white bg-red-700 dark:bg-red-600 rounded-md hover:bg-red-800 dark:hover:bg-red-500 disabled:opacity-50 whitespace-nowrap"
          >
            {isSubmitting || succeeded
              ? t.confirmDelete.removing
              : t.confirmDelete.removeTitle}
          </motion.button>
        </div>
      </div>
    </AdaptiveModal>
  );
}
