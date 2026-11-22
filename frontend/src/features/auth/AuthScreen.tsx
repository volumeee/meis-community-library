import { BookOpen } from 'lucide-react';
import { motion } from 'motion/react';
import { useShallow } from 'zustand/react/shallow';
import { LanguageToggle } from '../../components/layout/LanguageToggle';
import { ThemeToggle } from '../../components/layout/ThemeToggle';
import type { ThemeMode } from '../../hooks/useTheme';
import { useAuthStore } from '../../store/useAuthStore';
import { useI18n } from '../../store/useLocaleStore';
import { AuthCheckingCard } from './AuthCheckingCard';
import { DbDisconnectedCard } from './DbDisconnectedCard';
import { LoginForm } from './LoginForm';
import { SetupForm } from './SetupForm';

interface AuthScreenProps {
  theme: ThemeMode;
  onToggleTheme: () => void;
}

export function AuthScreen({ theme, onToggleTheme }: AuthScreenProps) {
  const { t } = useI18n();
  const {
    phase,
    defaultProfile,
    databaseError,
    requiresSetupToken,
    error,
    fieldErrors,
    isSubmitting,
    bootstrap,
    setupAccount,
    login,
    clearErrors,
  } = useAuthStore(
    useShallow((s) => ({
      phase: s.phase,
      defaultProfile: s.defaultProfile,
      databaseError: s.databaseError,
      requiresSetupToken: s.requiresSetupToken,
      error: s.error,
      fieldErrors: s.fieldErrors,
      isSubmitting: s.isSubmitting,
      bootstrap: s.bootstrap,
      setupAccount: s.setupAccount,
      login: s.login,
      clearErrors: s.clearErrors,
    }))
  );

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-canvas-dark text-slate-900 dark:text-slate-100">
      <header className="h-16 px-4 sm:px-8 flex items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-surface-dark/90 backdrop-blur-md">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-accent dark:bg-blue-600 text-white shrink-0">
            <BookOpen className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="font-display text-sm sm:text-base font-bold tracking-tight text-slate-900 dark:text-slate-50 truncate">
            <span className="sm:hidden">{t.meta.brandShort}</span>
            <span className="hidden sm:inline">{t.meta.brandFull}</span>
          </span>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <LanguageToggle variant="compact" layoutGroup="auth-lang" />
          <ThemeToggle theme={theme} onToggle={onToggleTheme} variant="icon" />
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-md bg-white dark:bg-surface-dark border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden"
        >
          {phase === 'checking' ? (
            <AuthCheckingCard />
          ) : phase === 'db-disconnected' ? (
            <DbDisconnectedCard
              databaseError={databaseError}
              onRetryConnection={bootstrap}
            />
          ) : phase === 'setup' ? (
            <SetupForm
              defaultProfile={defaultProfile}
              requiresSetupToken={requiresSetupToken}
              error={error}
              fieldErrors={fieldErrors}
              isSubmitting={isSubmitting}
              onSubmit={setupAccount}
              onClearErrors={clearErrors}
            />
          ) : (
            <LoginForm
              defaultEmail={defaultProfile.email}
              error={error}
              fieldErrors={fieldErrors}
              isSubmitting={isSubmitting}
              onSubmit={login}
              onClearErrors={clearErrors}
            />
          )}
        </motion.div>
      </main>
    </div>
  );
}
