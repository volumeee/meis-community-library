import { useRef, useState, type FormEvent } from 'react';
import { Info, KeyRound, ShieldCheck, X } from 'lucide-react';
import { motion, useIsPresent } from 'motion/react';
import type { AuthUser } from '@shared/library';
import { AdaptiveModal } from '../../components/ui/AdaptiveModal';
import { FormAlert } from '../../components/ui/FormAlert';
import { PasswordField } from '../../components/ui/PasswordField';
import { MEI_AVATAR_URL } from '../../config/assets';
import type { ChangePasswordResult } from '../../store/useAuthStore';
import { useI18n } from '../../store/useLocaleStore';
import { validateChangePasswordForm } from './authValidation';

interface ChangePasswordModalProps {
  user: AuthUser;
  onClose: () => void;
  onSubmit: (input: {
    currentPassword: string;
    newPassword: string;
  }) => Promise<ChangePasswordResult>;
  onSuccess: () => void;
}

export function ChangePasswordModal({
  user,
  onClose,
  onSubmit,
  onSuccess,
}: ChangePasswordModalProps) {
  const { t } = useI18n();
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const isPresent = useIsPresent();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [succeeded, setSucceeded] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const submittingRef = useRef(false);
  const isBusy = isSubmitting || succeeded || !isPresent;

  const canChangePassword = user.canChangePassword !== false;

  const initials =
    user.name
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('') || 'ML';

  const focusFirstError = (errors: Record<string, string>) => {
    if (errors.currentPassword) {
      document.getElementById('account-current-password')?.focus();
    } else if (errors.newPassword) {
      document.getElementById('account-new-password')?.focus();
    } else if (errors.confirmPassword) {
      document.getElementById('account-confirm-password')?.focus();
    }
  };

  const handleClose = () => {
    if (isBusy || submittingRef.current) return;
    onClose();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!canChangePassword || isBusy || submittingRef.current) return;

    const nextErrors = validateChangePasswordForm(
      { currentPassword, newPassword, confirmPassword },
      t.accountPassword
    );
    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      setFormError(null);
      focusFirstError(nextErrors);
      return;
    }

    submittingRef.current = true;
    setIsSubmitting(true);
    setFormError(null);
    setFieldErrors({});

    let ok = false;
    try {
      const result = await onSubmit({ currentPassword, newPassword });
      if (result.ok) {
        ok = true;
        setSucceeded(true);
        onSuccess();
        onClose();
        return;
      }
      const nextFieldErrors = result.fieldErrors ?? {};
      setFieldErrors(nextFieldErrors);
      setFormError(result.error ?? null);
      if (Object.keys(nextFieldErrors).length > 0) {
        focusFirstError(nextFieldErrors);
      }
    } finally {
      if (!ok) {
        submittingRef.current = false;
        setIsSubmitting(false);
      }
    }
  };

  return (
    <AdaptiveModal
      ariaLabelledBy="account-password-title"
      maxWidthClass="sm:max-w-md"
      onClose={handleClose}
    >
      <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-slate-100 dark:bg-slate-800 text-accent dark:text-blue-400 shrink-0">
            <KeyRound className="h-4 w-4" aria-hidden="true" />
          </span>
          <h2
            id="account-password-title"
            className="font-display text-lg font-semibold text-slate-900 dark:text-slate-50 truncate"
          >
            {t.accountPassword.modalTitle}
          </h2>
        </div>
        <button
          type="button"
          onClick={handleClose}
          disabled={isBusy}
          aria-label={t.accountPassword.close}
          className="inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors shrink-0"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-5 space-y-5">
        <div className="flex items-center gap-3.5 p-3.5 rounded-lg bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800">
          {!avatarFailed ? (
            <img
              src={MEI_AVATAR_URL}
              alt={`${user.name}, ${t.meta.headLibrarian}`}
              referrerPolicy="no-referrer"
              onError={() => setAvatarFailed(true)}
              className="h-11 w-11 rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0"
            />
          ) : (
            <div
              aria-hidden="true"
              className="h-11 w-11 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-display text-sm font-semibold flex items-center justify-center shrink-0"
            >
              {initials}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
              {user.name}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
              {user.email}
            </p>
            <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-accent dark:text-blue-400">
              <ShieldCheck className="h-3 w-3" aria-hidden="true" />
              {t.meta.headLibrarian}
            </span>
          </div>
        </div>

        {!canChangePassword ? (
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-amber-900 dark:text-amber-200">
              <Info className="h-4 w-4 mt-0.5 shrink-0" aria-hidden="true" />
              <div className="space-y-1 text-xs leading-relaxed">
                <p className="font-semibold">{t.accountPassword.envManagedTitle}</p>
                <p>{t.accountPassword.envManagedBody}</p>
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                data-autofocus="true"
                onClick={handleClose}
                className="min-h-[44px] px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                {t.accountPassword.close}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={(e) => void handleSubmit(e)} noValidate className="space-y-4">
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {t.accountPassword.modalSubtitle}
            </p>

            {formError && <FormAlert>{formError}</FormAlert>}

            <PasswordField
              id="account-current-password"
              label={t.accountPassword.currentPassword}
              value={currentPassword}
              onChange={(val) => {
                setCurrentPassword(val);
                if (fieldErrors.currentPassword || fieldErrors.newPassword) {
                  setFieldErrors((prev) => ({
                    ...prev,
                    currentPassword: '',
                    newPassword: '',
                  }));
                }
              }}
              autoComplete="current-password"
              placeholder={t.accountPassword.currentPasswordPlaceholder}
              disabled={isBusy}
              autoFocus
              error={fieldErrors.currentPassword}
            />

            <PasswordField
              id="account-new-password"
              label={t.accountPassword.newPassword}
              value={newPassword}
              onChange={(val) => {
                setNewPassword(val);
                if (fieldErrors.newPassword || fieldErrors.confirmPassword) {
                  setFieldErrors((prev) => ({
                    ...prev,
                    newPassword: '',
                    confirmPassword: '',
                  }));
                }
              }}
              autoComplete="new-password"
              placeholder={t.accountPassword.newPasswordPlaceholder}
              disabled={isBusy}
              error={fieldErrors.newPassword}
            />

            <PasswordField
              id="account-confirm-password"
              label={t.accountPassword.confirmNewPassword}
              value={confirmPassword}
              onChange={(val) => {
                setConfirmPassword(val);
                if (fieldErrors.confirmPassword) {
                  setFieldErrors((prev) => ({ ...prev, confirmPassword: '' }));
                }
              }}
              autoComplete="new-password"
              placeholder={t.accountPassword.confirmNewPasswordPlaceholder}
              disabled={isBusy}
              error={fieldErrors.confirmPassword}
            />

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={handleClose}
                disabled={isBusy}
                className="min-h-[44px] px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 whitespace-nowrap"
              >
                {t.accountPassword.cancel}
              </button>
              <motion.button
                type="submit"
                whileTap={{ scale: 0.97 }}
                disabled={isBusy}
                className="min-h-[44px] px-4 py-2 text-sm font-medium text-white bg-accent dark:bg-blue-600 rounded-md hover:bg-accent-hover dark:hover:bg-blue-500 disabled:opacity-50 whitespace-nowrap"
              >
                {isSubmitting || succeeded
                  ? t.accountPassword.saving
                  : t.accountPassword.savePassword}
              </motion.button>
            </div>
          </form>
        )}
      </div>
    </AdaptiveModal>
  );
}
