import { RefreshCw } from 'lucide-react';
import { useI18n } from '../../store/useLocaleStore';

export function AuthCheckingCard() {
  const { t } = useI18n();

  return (
    <div className="p-8 text-center space-y-3" role="status" aria-live="polite">
      <div className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-accent dark:text-blue-400">
        <RefreshCw className="h-5 w-5 animate-spin" aria-hidden="true" />
      </div>
      <h1 className="font-display text-lg font-semibold text-slate-900 dark:text-slate-50">
        {t.auth.connectingTitle}
      </h1>
      <p className="text-sm text-slate-500 dark:text-slate-400">
        {t.auth.connectingSubtitle}
      </p>
    </div>
  );
}
