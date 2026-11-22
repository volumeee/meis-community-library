import { AppError } from '../errors';
import { isValidEmail } from '../utils/validation/primitives';

export interface ValidatedSetupInput {
  name: string;
  email: string;
  password: string;
}

export interface ValidatedLoginInput {
  email: string;
  password: string;
}

export interface ValidatedChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

export function validateSetupPayload(raw: unknown): ValidatedSetupInput {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new AppError(400, 'Invalid setup payload.');
  }

  const body = raw as Record<string, unknown>;
  const fieldErrors: Record<string, string> = {};

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';

  if (name.length < 2 || name.length > 120) {
    fieldErrors.name = 'Name must be between 2 and 120 characters.';
  }
  if (!isValidEmail(email)) {
    fieldErrors.email = 'Please enter a valid email address.';
  }
  if (password.length < 8 || password.length > 128 || password.trim().length === 0) {
    fieldErrors.password =
      password.length >= 8 && password.length <= 128
        ? 'Password cannot be only whitespace.'
        : 'Password must be between 8 and 128 characters.';
  }

  if (Object.keys(fieldErrors).length > 0) {
    throw new AppError(400, 'Please fix the highlighted fields.', fieldErrors);
  }

  return { name, email, password };
}

export function validateLoginPayload(raw: unknown): ValidatedLoginInput {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new AppError(400, 'Invalid login payload.');
  }

  const body = raw as Record<string, unknown>;
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';

  if (!email || !password || email.length > 160 || password.length > 128) {
    throw new AppError(400, 'Email and password are required.');
  }

  return { email, password };
}

export function validateChangePasswordPayload(
  raw: unknown
): ValidatedChangePasswordInput {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new AppError(400, 'Invalid password change payload.');
  }

  const body = raw as Record<string, unknown>;
  const currentPassword =
    typeof body.currentPassword === 'string' ? body.currentPassword : '';
  const newPassword = typeof body.newPassword === 'string' ? body.newPassword : '';
  const hasConfirmPassword = body.confirmPassword !== undefined;
  const confirmPassword =
    typeof body.confirmPassword === 'string' ? body.confirmPassword : '';
  const fieldErrors: Record<string, string> = {};

  if (!currentPassword || currentPassword.length > 128) {
    fieldErrors.currentPassword = 'Current password is required.';
  }
  if (
    newPassword.length < 8 ||
    newPassword.length > 128 ||
    newPassword.trim().length === 0
  ) {
    fieldErrors.newPassword =
      newPassword.length >= 8 && newPassword.length <= 128
        ? 'New password cannot be only whitespace.'
        : 'New password must be between 8 and 128 characters.';
  } else if (currentPassword && newPassword === currentPassword) {
    fieldErrors.newPassword =
      'New password must be different from your current password.';
  }
  if (hasConfirmPassword && confirmPassword !== newPassword) {
    fieldErrors.confirmPassword = 'Passwords do not match.';
  }

  if (Object.keys(fieldErrors).length > 0) {
    throw new AppError(400, 'Please fix the highlighted fields.', fieldErrors);
  }

  return { currentPassword, newPassword };
}
