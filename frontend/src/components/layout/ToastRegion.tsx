import { useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useI18n } from '../../store/useLocaleStore';
import { useToastStore, type ToastMessage } from '../../store/useToastStore';

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: ToastMessage;
  onDismiss: (id: string) => void;
}) {
  const { t } = useI18n();
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const timer = window.setTimeout(() => {
      onDismiss(toast.id);
    }, 4500);
    return () => window.clearTimeout(timer);
  }, [paused, toast.id, onDismiss]);

  const isError = toast.tone === 'error';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 14, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 420, damping: 32 }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      role={isError ? 'alert' : 'status'}
      className={`pointer-events-auto flex items-start gap-3 w-full sm:w-[380px] px-4 py-3 rounded-lg border shadow-lg ${
        isError
          ? 'bg-red-50 dark:bg-red-950/90 border-red-200 dark:border-red-900 text-red-900 dark:text-red-100'
          : 'bg-white dark:bg-surface-dark border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100'
      }`}
    >
      {isError ? (
        <AlertCircle
          className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5"
          aria-hidden="true"
        />
      ) : (
        <CheckCircle2
          className="h-4 w-4 text-emerald-700 dark:text-emerald-400 shrink-0 mt-0.5"
          aria-hidden="true"
        />
      )}
      <p className="flex-1 text-sm leading-snug">{toast.message}</p>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        aria-label={t.toast.dismissAria}
        className="inline-flex h-8 w-8 -mr-1.5 -mt-1 items-center justify-center rounded-md text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent dark:focus-visible:outline-blue-400"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </motion.div>
  );
}

export function ToastRegion() {
  const toasts = useToastStore((s) => s.toasts);
  const dismissToast = useToastStore((s) => s.dismissToast);
  return (
    <div className="pointer-events-none fixed inset-x-4 top-[64px] lg:left-auto lg:right-6 lg:top-[76px] z-[60] flex flex-col gap-2.5 items-end">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={dismissToast} />
        ))}
      </AnimatePresence>
    </div>
  );
}
