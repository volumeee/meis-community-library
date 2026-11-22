import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Lock, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';
import { FormAlert } from '../../components/ui/FormAlert';
import { PasswordField } from '../../components/ui/PasswordField';
import { useI18n } from '../../store/useLocaleStore';
import { validateSetupForm } from './authValidation';

interface SetupFormProps {
  defaultProfile: { name: string; email: string };
  requiresSetupToken: boolean;
  error: string | null;
  fieldErrors: Record<string, string>;
  isSubmitting: boolean;
  onSubmit: (input: {
    name: string;
    email: string;
    password: string;
    setupToken?: string;
  }) => Promise<boolean>;
  onClearErrors: () => void;
}

const INPUT_BASE =
  'w-full h-11 px-3 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-accent dark:focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-accent/15 dark:focus:ring-blue-500/20 disabled:opacity-60 disabled:cursor-not-allowed';

export function SetupForm({
  defaultProfile,
  requiresSetupToken,
  error,
  fieldErrors,
  isSubmitting,
  onSubmit,
  onClearErrors,
}: SetupFormProps) {
  const { t } = useI18n();
  const [name, setName] = useState(defaultProfile.name);
  const [email, setEmail] = useState(defaultProfile.email);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [setupToken, setSetupToken] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [localFieldErrors, setLocalFieldErrors] = useState<Record<string, string>>({});
  const submittingRef = useRef(false);

  useEffect(() => {
    setName(defaultProfile.name);
    setEmail(defaultProfile.email);
  }, [defaultProfile.name, defaultProfile.email]);

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

    const nextLocal = validateSetupForm(
      { password, confirmPassword, setupToken, requiresSetupToken },
      t.auth
    );
    if (Object.keys(nextLocal).length > 0) {
      setLocalFieldErrors(nextLocal);
      setLocalError(Object.values(nextLocal)[0]);
      const firstId = nextLocal.password
        ? 'setup-password'
        : nextLocal.confirmPassword
          ? 'setup-confirm-password'
          : 'setup-token';
      document.getElementById(firstId)?.focus();
      return;
    }

    submittingRef.current = true;
    try {
      await onSubmit({
        name: name.trim(),
        email: email.trim(),
        password,
        ...(requiresSetupToken ? { setupToken: setupToken.trim() } : {}),
      });
    } finally {
      submittingRef.current = false;
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="p-6 sm:p-8 space-y-5">
      <div className="space-y-1.5">
        <div className="inline-flex items-center gap-1.5 text-xs font-medium text-accent dark:text-blue-400">
          <ShieldCheck className="h-4 w-4" aria-hidden="true" />
          <span>{t.auth.firstTimeBadge}</span>
        </div>
        <h1 className="font-display text-xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
          {t.auth.setupTitle}
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          {t.auth.setupSubtitle}
        </p>
      </div>

      {(localError || error) && (
        <FormAlert id="setup-form-error">{localError || error}</FormAlert>
      )}

      <div className="space-y-3.5">
        <div>
          <label
            htmlFor="setup-name"
            className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
          >
            {t.auth.librarianName}
          </label>
          <input
            id="setup-name"
            type="text"
            autoComplete="name"
            disabled={isSubmitting}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              clearInputErrors('name');
            }}
            aria-invalid={Boolean(activeFieldErrors.name)}
            aria-describedby={activeFieldErrors.name ? 'setup-name-error' : undefined}
            className={INPUT_BASE}
          />
          {activeFieldErrors.name && (
            <p
              id="setup-name-error"
              className="mt-1 text-xs text-red-700 dark:text-red-400"
            >
              {activeFieldErrors.name}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="setup-email"
            className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
          >
            {t.auth.emailAddress}
          </label>
          <input
            id="setup-email"
            type="email"
            autoComplete="username"
            disabled={isSubmitting}
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              clearInputErrors('email');
            }}
            aria-invalid={Boolean(activeFieldErrors.email)}
            aria-describedby={activeFieldErrors.email ? 'setup-email-error' : undefined}
            className={INPUT_BASE}
          />
          {activeFieldErrors.email && (
            <p
              id="setup-email-error"
              className="mt-1 text-xs text-red-700 dark:text-red-400"
            >
              {activeFieldErrors.email}
            </p>
          )}
        </div>

        <PasswordField
          id="setup-password"
          label={t.auth.createPassword}
          value={password}
          onChange={(val) => {
            setPassword(val);
            clearInputErrors('password', 'confirmPassword');
          }}
          autoComplete="new-password"
          placeholder={t.auth.createPasswordPlaceholder}
          disabled={isSubmitting}
          error={activeFieldErrors.password}
          visible={showPassword}
          onToggleVisible={() => setShowPassword((v) => !v)}
        />

        <PasswordField
          id="setup-confirm-password"
          label={t.auth.confirmPassword}
          value={confirmPassword}
          onChange={(val) => {
            setConfirmPassword(val);
            clearInputErrors('confirmPassword');
          }}
          autoComplete="new-password"
          placeholder={t.auth.confirmPasswordPlaceholder}
          disabled={isSubmitting}
          error={activeFieldErrors.confirmPassword}
          visible={showPassword}
          hideToggle
        />

        {requiresSetupToken && (
          <PasswordField
            id="setup-token"
            label={t.auth.setupTokenLabel}
            value={setupToken}
            onChange={(val) => {
              setSetupToken(val);
              clearInputErrors('setupToken');
            }}
            autoComplete="off"
            placeholder={t.auth.setupTokenPlaceholder}
            disabled={isSubmitting}
            error={activeFieldErrors.setupToken}
            visible={false}
            hideToggle
          />
        )}
      </div>

      <motion.button
        type="submit"
        whileTap={{ scale: 0.97 }}
        disabled={isSubmitting}
        className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-accent dark:bg-blue-600 rounded-md hover:bg-accent-hover dark:hover:bg-blue-500 disabled:opacity-50 transition-colors"
      >
        <Lock className="h-4 w-4" aria-hidden="true" />
        <span>{isSubmitting ? t.auth.creatingAccount : t.auth.saveAccountAndEnter}</span>
      </motion.button>
    </form>
  );
}
