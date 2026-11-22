import type { Book } from '../../../../shared/library';
import { AppError } from '../../errors';
import type { ILibraryRepository } from '../../repositories/library';
import {
  requireBookId,
  validateBookPayload,
  validateBookQuery,
  validateBookUpdatePayload,
} from '../../validators/book.validator';

export class BooksService {
  constructor(private readonly repository: ILibraryRepository) {}

  async listGenres(): Promise<string[]> {
    return this.repository.listGenres();
  }

  async listBooks(rawQuery: Record<string, unknown>): Promise<Book[]> {
    const query = validateBookQuery(rawQuery);
    return this.repository.findBooks(query);
  }

  async getBookById(rawId: unknown): Promise<Book> {
    const id = requireBookId(rawId);
    const book = await this.repository.findBookById(id);
    if (!book) {
      throw new AppError(404, 'Book not found.');
    }
    return book;
  }

  async addBook(rawBody: unknown): Promise<Book> {
    const input = validateBookPayload(rawBody);
    return this.repository.createBook(input);
  }

  async updateBook(rawId: unknown, rawBody: unknown): Promise<Book> {
    const id = requireBookId(rawId);
    const input = validateBookUpdatePayload(rawBody);
    const updated = await this.repository.updateBook(id, input);
    if (!updated) {
      throw new AppError(404, 'Book not found.');
    }
    return updated;
  }

  async removeBook(rawId: unknown): Promise<void> {
    const id = requireBookId(rawId);
    const removed = await this.repository.deleteBook(id);
    if (!removed) {
      throw new AppError(404, 'Book not found.');
    }
  }
}
