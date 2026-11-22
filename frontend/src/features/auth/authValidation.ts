import type { TranslationDictionary } from '../../i18n/translations';

export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 128;

export function validateSetupForm(
  input: {
    password: string;
    confirmPassword: string;
    setupToken: string;
    requiresSetupToken: boolean;
  },
  t: TranslationDictionary['auth']
): Record<string, string> {
  const errors: Record<string, string> = {};
  if (input.password.length < MIN_PASSWORD_LENGTH) {
    errors.password = t.errPasswordShort;
  } else if (input.password !== input.confirmPassword) {
    errors.confirmPassword = t.errPasswordMismatch;
  }
  if (input.requiresSetupToken && !input.setupToken.trim()) {
    errors.setupToken = t.errSetupTokenRequired;
  }
  return errors;
}

export function validateLoginForm(
  input: { email: string; password: string },
  t: TranslationDictionary['auth']
): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!input.email.trim()) errors.email = t.errEmailPasswordRequired;
  if (!input.password) errors.password = t.errEmailPasswordRequired;
  return errors;
}

export function validateChangePasswordForm(
  input: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  },
  t: TranslationDictionary['accountPassword']
): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!input.currentPassword) {
    errors.currentPassword = t.errCurrentRequired;
  }
  if (input.newPassword.length < MIN_PASSWORD_LENGTH) {
    errors.newPassword = t.errNewShort;
  } else if (input.newPassword.length > MAX_PASSWORD_LENGTH) {
    errors.newPassword = t.errNewTooLong;
  } else if (input.currentPassword && input.newPassword === input.currentPassword) {
    errors.newPassword = t.errSameAsCurrent;
  }
  if (input.confirmPassword !== input.newPassword) {
    errors.confirmPassword = t.errConfirmMismatch;
  }
  return errors;
}
