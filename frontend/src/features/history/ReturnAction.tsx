import { useCallback, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useI18n } from '../../store/useLocaleStore';
import type { LendingTransaction } from '@shared/library';

interface ReturnActionProps {
  tx: LendingTransaction;
  compact?: boolean;
  confirmingReturnId: string | null;
  isSubmitting: boolean;
  onStart: (id: string | null) => void;
  onConfirm: (id: string) => Promise<void>;
}

export function ReturnAction({
  tx,
  compact = false,
  confirmingReturnId,
  isSubmitting,
  onStart,
  onConfirm,
}: ReturnActionProps) {
  const { t } = useI18n();
  const isConfirming = confirmingReturnId === tx.id;
  const confirmButtonRef = useRef<HTMLButtonElement | null>(null);
  const initialButtonRef = useRef<HTMLButtonElement | null>(null);
  const pendingFocusRef = useRef<'confirm' | 'initial' | null>(null);

  useEffect(() => {
    if (!isConfirming && pendingFocusRef.current === 'confirm') {
      pendingFocusRef.current = null;
    } else if (isConfirming && pendingFocusRef.current === 'initial') {
      pendingFocusRef.current = null;
    }
  }, [isConfirming]);

  const setConfirmRef = useCallback((node: HTMLButtonElement | null) => {
    confirmButtonRef.current = node;
    if (node && pendingFocusRef.current === 'confirm') {
      pendingFocusRef.current = null;
      node.focus();
    }
  }, []);

  const setInitialRef = useCallback((node: HTMLButtonElement | null) => {
    initialButtonRef.current = node;
    if (node && pendingFocusRef.current === 'initial') {
      pendingFocusRef.current = null;
      node.focus();
    }
  }, []);

  return (
    <AnimatePresence mode="wait" initial={false}>
      {isConfirming ? (
        <motion.div
          key="confirm-pair"
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.13 }}
          className="inline-flex items-center gap-1.5"
        >
          <motion.button
            ref={setConfirmRef}
            type="button"
            whileTap={{ scale: 0.96 }}
            disabled={isSubmitting}
            onClick={() => {
              pendingFocusRef.current = 'initial';
              void onConfirm(tx.id);
            }}
            aria-label={t.history.confirmReturnAria(tx.referenceCode)}
            className={`${compact ? 'min-h-[40px] px-3' : 'px-2.5 py-1.5'} text-xs font-medium text-white bg-emerald-700 dark:bg-emerald-600 rounded hover:bg-emerald-800 dark:hover:bg-emerald-500 disabled:opacity-50 whitespace-nowrap`}
          >
            {t.history.confirmReturn}
          </motion.button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => {
              pendingFocusRef.current = 'initial';
              onStart(null);
            }}
            className={`${compact ? 'min-h-[40px] px-2.5' : 'px-2 py-1.5'} text-xs font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 whitespace-nowrap`}
          >
            {t.history.cancel}
          </button>
        </motion.div>
      ) : (
        <motion.button
          ref={setInitialRef}
          key="initial-return"
          type="button"
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.13 }}
          whileTap={{ scale: 0.96 }}
          disabled={isSubmitting}
          onClick={() => {
            pendingFocusRef.current = 'confirm';
            onStart(tx.id);
          }}
          aria-label={t.history.returnBooksAria(tx.referenceCode)}
          className={`${compact ? 'min-h-[44px] px-3.5' : 'px-2.5 py-1.5'} text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 whitespace-nowrap`}
        >
          {t.history.returnBooks}
        </motion.button>
      )}
    </AnimatePresence>
  );
}
