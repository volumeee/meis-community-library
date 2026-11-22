import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useI18n } from '../../store/useLocaleStore';

interface PasswordFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  hint?: string;
  /** Additional aria-invalid trigger (e.g. form-level auth error). */
  invalid?: boolean;
  /** Fallback aria-describedby id when no field-specific error is present. */
  fallbackDescribedBy?: string;
  /** Sets data-autofocus="true" for AdaptiveModal initial focus. */
  autoFocus?: boolean;
  /** Optional externally controlled visibility (e.g. linked password + confirm fields). */
  visible?: boolean;
  onToggleVisible?: () => void;
  /** Hide the toggle button (e.g. confirm field sharing visibility with primary field). */
  hideToggle?: boolean;
  labelClassName?: string;
}

export function PasswordField({
  id,
  label,
  value,
  onChange,
  autoComplete,
  placeholder,
  disabled = false,
  required,
  error,
  hint,
  invalid = false,
  fallbackDescribedBy,
  autoFocus = false,
  visible,
  onToggleVisible,
  hideToggle = false,
  labelClassName = 'block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1',
}: PasswordFieldProps) {
  const { t } = useI18n();
  const [internalVisible, setInternalVisible] = useState(false);

  const isVisible = visible ?? internalVisible;
  const toggle = onToggleVisible ?? (() => setInternalVisible((prev) => !prev));
  const errorId = error ? `${id}-error` : undefined;
  const hintId = !error && hint ? `${id}-hint` : undefined;
  const isInvalid = Boolean(error) || invalid;

  return (
    <div>
      <label htmlFor={id} className={labelClassName}>
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          data-autofocus={autoFocus ? 'true' : undefined}
          type={isVisible ? 'text' : 'password'}
          autoComplete={autoComplete}
          required={required}
          disabled={disabled}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          aria-invalid={isInvalid}
          aria-describedby={errorId ?? fallbackDescribedBy ?? hintId}
          className={`w-full h-11 px-3 ${hideToggle ? '' : 'pr-10'} bg-white dark:bg-slate-900 border rounded-md text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
            error
              ? 'border-red-500 dark:border-red-500 focus:border-red-600 focus:ring-red-500/20'
              : 'border-slate-300 dark:border-slate-700 focus:border-accent dark:focus:border-blue-500 focus:ring-accent/15 dark:focus:ring-blue-500/20'
          }`}
        />
        {!hideToggle && (
          <button
            type="button"
            disabled={disabled}
            onClick={toggle}
            aria-pressed={isVisible}
            aria-label={`${isVisible ? t.auth.hidePassword : t.auth.showPassword}: ${label}`}
            className="absolute right-1 top-1/2 -translate-y-1/2 inline-flex h-9 w-9 items-center justify-center rounded text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent dark:focus-visible:outline-blue-400"
          >
            {isVisible ? (
              <EyeOff className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Eye className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        )}
      </div>
      {error ? (
        <p id={errorId} className="mt-1 text-xs text-red-700 dark:text-red-400">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
