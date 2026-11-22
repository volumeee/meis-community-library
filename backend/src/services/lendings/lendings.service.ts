import crypto from 'node:crypto';
import type {
  CreateLendingInput,
  LendingPreview,
  LendingPreviewItem,
  LendingTransaction,
} from '../../../../shared/library';
import { AppError } from '../../errors';
import type { ILibraryRepository } from '../../repositories/library';
import {
  requireLendingId,
  validateLendingPayload,
} from '../../validators/lending.validator';

export class LendingsService {
  constructor(private readonly repository: ILibraryRepository) {}

  async listLendings(): Promise<LendingTransaction[]> {
    return this.repository.findLendings();
  }

  async previewLending(rawBody: CreateLendingInput | unknown): Promise<LendingPreview> {
    const { borrowerName, borrowerPhone, dueDate, requestedByBookId } =
      validateLendingPayload(rawBody);

    const bookIds = Array.from(requestedByBookId.keys());
    const foundBooks = await this.repository.findBooksByIds(bookIds);
    const bookMap = new Map(foundBooks.map((b) => [b.id, b]));

    const previewItems: LendingPreviewItem[] = [];
    for (const [bookId, quantity] of requestedByBookId.entries()) {
      const book = bookMap.get(bookId);
      if (!book) {
        throw new AppError(404, 'One or more selected books could not be found.');
      }
      if (book.stock < quantity) {
        throw new AppError(
          409,
          `Not enough stock for "${book.title}". Available: ${book.stock}, requested: ${quantity}.`,
          { items: `Insufficient stock for "${book.title}" (${book.stock} available).` }
        );
      }

      previewItems.push({
        bookId: book.id,
        bookTitle: book.title,
        author: book.author,
        genre: book.genre,
        quantity,
        availableStock: book.stock,
        remainingStock: book.stock - quantity,
      });
    }

    const totalCopies = previewItems.reduce((sum, item) => sum + item.quantity, 0);

    return {
      borrowerName,
      borrowerPhone,
      dueDate,
      items: previewItems,
      totalTitles: previewItems.length,
      totalCopies,
    };
  }

  async createLending(
    rawBody: CreateLendingInput | unknown
  ): Promise<LendingTransaction> {
    const preview = await this.previewLending(rawBody);
    const items = preview.items.map(({ bookId, bookTitle, author, genre, quantity }) => ({
      bookId,
      bookTitle,
      author,
      genre,
      quantity,
    }));

    for (let attempt = 0; attempt < 3; attempt++) {
      const referenceCode = `MCL-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
      try {
        return await this.repository.createLendingWithStockDeduction({
          referenceCode,
          borrowerName: preview.borrowerName,
          borrowerPhone: preview.borrowerPhone,
          dueDate: preview.dueDate,
          items,
          totalCopies: preview.totalCopies,
        });
      } catch (error) {
        const isDuplicateKey =
          typeof error === 'object' &&
          error !== null &&
          'code' in error &&
          error.code === 11000;
        if (!isDuplicateKey || attempt === 2) {
          throw error;
        }
      }
    }
    throw new AppError(500, 'Could not generate a unique lending reference code.');
  }

  async returnLending(rawId: unknown): Promise<LendingTransaction> {
    const id = requireLendingId(rawId);

    const existing = await this.repository.findLendingById(id);
    if (!existing) {
      throw new AppError(404, 'Lending transaction not found.');
    }
    if (existing.status === 'Returned') {
      throw new AppError(409, 'This lending transaction has already been returned.');
    }

    const updated = await this.repository.markLendingReturned(id);
    if (!updated) {
      throw new AppError(409, 'Unable to mark lending transaction as returned.');
    }
    return updated;
  }
}
