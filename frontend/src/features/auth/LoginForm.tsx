import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Lock } from 'lucide-react';
import { motion } from 'motion/react';
import { FormAlert } from '../../components/ui/FormAlert';
import { PasswordField } from '../../components/ui/PasswordField';
import { useI18n } from '../../store/useLocaleStore';
import { validateLoginForm } from './authValidation';

interface LoginFormProps {
  defaultEmail: string;
  error: string | null;
  fieldErrors: Record<string, string>;
  isSubmitting: boolean;
  onSubmit: (input: { email: string; password: string }) => Promise<boolean>;
  onClearErrors: () => void;
}

const INPUT_BASE =
  'w-full h-11 px-3 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-accent dark:focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-accent/15 dark:focus:ring-blue-500/20 disabled:opacity-60 disabled:cursor-not-allowed';

export function LoginForm({
  defaultEmail,
  error,
  fieldErrors,
  isSubmitting,
  onSubmit,
  onClearErrors,
}: LoginFormProps) {
  const { t } = useI18n();
  const [email, setEmail] = useState(defaultEmail);
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [localFieldErrors, setLocalFieldErrors] = useState<Record<string, string>>({});
  const submittingRef = useRef(false);

  useEffect(() => {
    setEmail(defaultEmail);
  }, [defaultEmail]);

  const activeFieldErrors = { ...fieldErrors, ...localFieldErrors };

  const clearInputErrors = (...fields: string[]) => {
    if (localError) setLocalError(null);
    if (fields.some((f) => localFieldErrors[f])) {
      setLocalFieldErrors((prev) => {
        const next = { ...prev };
        for (const f of fields) delete next[f];
        return next;
      });
    }
    if (error || Object.keys(fieldErrors).length > 0) {
      onClearErrors();
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isSubmitting || submittingRef.current) return;
    setLocalError(null);
    setLocalFieldErrors({});
    onClearErrors();

    const nextLocal = validateLoginForm({ email, password }, t.auth);
    if (Object.keys(nextLocal).length > 0) {
      setLocalFieldErrors(nextLocal);
      setLocalError(t.auth.errEmailPasswordRequired);
      document
        .getElementById(nextLocal.email ? 'login-email' : 'login-password')
        ?.focus();
      return;
    }

    submittingRef.current = true;
    try {
      await onSubmit({
        email: email.trim(),
        password,
      });
    } finally {
      submittingRef.current = false;
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="p-6 sm:p-8 space-y-5">
      <div className="space-y-1.5">
        <h1 className="font-display text-xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
          {t.auth.loginTitle}
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {t.auth.loginSubtitle}
        </p>
      </div>

      {(localError || error) && (
        <FormAlert id="login-form-error">{localError || error}</FormAlert>
      )}

      <div className="space-y-3.5">
        <div>
          <label
            htmlFor="login-email"
            className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
          >
            {t.auth.emailAddress}
          </label>
          <input
            id="login-email"
            type="email"
            autoComplete="username"
            disabled={isSubmitting}
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              clearInputErrors('email');
            }}
            aria-invalid={Boolean(activeFieldErrors.email || error)}
            aria-describedby={
              activeFieldErrors.email
                ? 'login-email-error'
                : error
                  ? 'login-form-error'
                  : undefined
            }
            placeholder="mei@communitylibrary.org"
            className={INPUT_BASE}
          />
          {activeFieldErrors.email && (
            <p
              id="login-email-error"
              className="mt-1 text-xs text-red-700 dark:text-red-400"
            >
              {activeFieldErrors.email}
            </p>
          )}
        </div>

        <PasswordField
          id="login-password"
          label={t.auth.password}
          value={password}
          onChange={(val) => {
            setPassword(val);
            clearInputErrors('password');
          }}
          autoComplete="current-password"
          placeholder={t.auth.passwordPlaceholder}
          disabled={isSubmitting}
          error={activeFieldErrors.password}
          invalid={Boolean(error)}
          fallbackDescribedBy={error ? 'login-form-error' : undefined}
        />
      </div>

      <motion.button
        type="submit"
        whileTap={{ scale: 0.97 }}
        disabled={isSubmitting}
        className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-accent dark:bg-blue-600 rounded-md hover:bg-accent-hover dark:hover:bg-blue-500 disabled:opacity-50 transition-colors"
      >
        <Lock className="h-4 w-4" aria-hidden="true" />
        <span>{isSubmitting ? t.auth.signingIn : t.auth.signIn}</span>
      </motion.button>
    </form>
  );
}
