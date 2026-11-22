import { Database, RefreshCw } from 'lucide-react';
import { motion } from 'motion/react';
import { FormAlert } from '../../components/ui/FormAlert';
import { useI18n } from '../../store/useLocaleStore';

interface DbDisconnectedCardProps {
  databaseError: string | null;
  onRetryConnection: () => Promise<void>;
}

export function DbDisconnectedCard({
  databaseError,
  onRetryConnection,
}: DbDisconnectedCardProps) {
  const { t } = useI18n();

  return (
    <div className="p-6 sm:p-8 space-y-5">
      <div className="flex items-start gap-3.5">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 shrink-0">
          <Database className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <h1 className="font-display text-lg font-semibold text-slate-900 dark:text-slate-50">
            {t.auth.connectDbTitle}
          </h1>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            {t.auth.connectDbSubtitle}
          </p>
        </div>
      </div>

      {databaseError && <FormAlert tone="warning">{databaseError}</FormAlert>}

      <ol className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300 list-decimal pl-4 leading-relaxed">
        <li>
          {t.auth.connectStep1Prefix}{' '}
          <code className="font-mono text-slate-900 dark:text-slate-100">
            MONGODB_URI
          </code>{' '}
          {t.auth.connectStep1Middle}{' '}
          <strong className="font-medium text-slate-900 dark:text-slate-100">
            Settings → Secrets
          </strong>{' '}
          {t.auth.connectStep1Suffix}
        </li>
        <li>
          {t.auth.connectStep2Prefix}{' '}
          <strong className="font-medium text-slate-900 dark:text-slate-100">
            Network Access
          </strong>
          {t.auth.connectStep2Middle}{' '}
          <code className="font-mono text-slate-900 dark:text-slate-100">0.0.0.0/0</code>
          {t.auth.connectStep2Suffix}
        </li>
        <li>{t.auth.connectStep3}</li>
      </ol>

      <motion.button
        type="button"
        whileTap={{ scale: 0.97 }}
        onClick={() => void onRetryConnection()}
        className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-accent dark:bg-blue-600 rounded-md hover:bg-accent-hover dark:hover:bg-blue-500 transition-colors"
      >
        <RefreshCw className="h-4 w-4" aria-hidden="true" />
        <span>{t.auth.retryConnection}</span>
      </motion.button>
    </div>
  );
}
