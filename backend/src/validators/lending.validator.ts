import { AppError } from '../errors';
import {
  asInteger,
  asTrimmedString,
  isValidDueDate,
  isValidPhone,
} from '../utils/validation/primitives';

export interface ValidatedLendingInput {
  borrowerName: string;
  borrowerPhone: string;
  dueDate: string;
  requestedByBookId: Map<string, number>;
}

export function requireLendingId(rawId: unknown): string {
  const id = asTrimmedString(rawId);
  if (!id) {
    throw new AppError(400, 'Lending transaction ID is required.');
  }
  return id;
}

export function validateLendingPayload(rawBody: unknown): ValidatedLendingInput {
  if (!rawBody || typeof rawBody !== 'object' || Array.isArray(rawBody)) {
    throw new AppError(400, 'Invalid lending transaction payload.');
  }

  const body = rawBody as Record<string, unknown>;
  const fieldErrors: Record<string, string> = {};

  const borrowerName = asTrimmedString(body.borrowerName);
  const borrowerPhone = asTrimmedString(body.borrowerPhone);
  const dueDate = asTrimmedString(body.dueDate);
  const rawItems = body.items;

  if (borrowerName.length < 2 || borrowerName.length > 120) {
    fieldErrors.borrowerName = 'Borrower name is required (at least 2 characters).';
  }

  if (!isValidPhone(borrowerPhone)) {
    fieldErrors.borrowerPhone =
      'Enter a valid phone number (7–15 digits; spaces, +, -, and () allowed).';
  }

  if (!isValidDueDate(dueDate)) {
    fieldErrors.dueDate = 'Select a valid due date that is today or in the future.';
  }

  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    fieldErrors.items = 'Add at least one book to the lending list.';
  } else if (rawItems.length > 100) {
    fieldErrors.items =
      'A lending transaction cannot contain more than 100 item entries.';
  }

  if (Object.keys(fieldErrors).length > 0) {
    throw new AppError(400, 'Please complete all required lending fields.', fieldErrors);
  }

  // Aggregate duplicate bookIds cleanly so stock checks account for combined quantity
  const requestedByBookId = new Map<string, number>();
  for (const entry of rawItems as unknown[]) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      throw new AppError(400, 'Each lending item must specify a bookId and quantity.');
    }
    const record = entry as Record<string, unknown>;
    const bookId = asTrimmedString(record.bookId);
    const quantity = asInteger(record.quantity);

    if (!bookId) {
      throw new AppError(400, 'Each lending item must include a valid bookId.');
    }
    if (quantity === null || quantity < 1 || quantity > 100) {
      throw new AppError(400, 'Quantity must be a whole number between 1 and 100.');
    }

    const totalQuantity = (requestedByBookId.get(bookId) ?? 0) + quantity;
    if (totalQuantity > 100) {
      throw new AppError(400, 'Quantity must be a whole number between 1 and 100.');
    }
    requestedByBookId.set(bookId, totalQuantity);
  }

  if (requestedByBookId.size > 50) {
    throw new AppError(
      400,
      'A lending transaction cannot include more than 50 distinct books.',
      { items: 'Select at most 50 distinct books per lending transaction.' }
    );
  }

  return {
    borrowerName,
    borrowerPhone,
    dueDate,
    requestedByBookId,
  };
}
