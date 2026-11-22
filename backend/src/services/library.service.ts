import type {
  Book,
  CreateLendingInput,
  LendingPreview,
  LendingTransaction,
} from '../../../shared/library';
import type { ILibraryRepository } from '../repositories/library';
import { BooksService } from './books/books.service';
import { LendingsService } from './lendings/lendings.service';

export class LibraryService {
  public readonly books: BooksService;
  public readonly lendings: LendingsService;

  constructor(private readonly repository: ILibraryRepository) {
    this.books = new BooksService(repository);
    this.lendings = new LendingsService(repository);
  }

  getStorageEngine(): string {
    return this.repository.storageEngine;
  }

  listGenres(): Promise<string[]> {
    return this.books.listGenres();
  }

  listBooks(rawQuery: Record<string, unknown>): Promise<Book[]> {
    return this.books.listBooks(rawQuery);
  }

  getBookById(rawId: unknown): Promise<Book> {
    return this.books.getBookById(rawId);
  }

  addBook(rawBody: unknown): Promise<Book> {
    return this.books.addBook(rawBody);
  }

  updateBook(rawId: unknown, rawBody: unknown): Promise<Book> {
    return this.books.updateBook(rawId, rawBody);
  }

  removeBook(rawId: unknown): Promise<void> {
    return this.books.removeBook(rawId);
  }

  listLendings(): Promise<LendingTransaction[]> {
    return this.lendings.listLendings();
  }

  previewLending(rawBody: CreateLendingInput | unknown): Promise<LendingPreview> {
    return this.lendings.previewLending(rawBody);
  }

  createLending(rawBody: CreateLendingInput | unknown): Promise<LendingTransaction> {
    return this.lendings.createLending(rawBody);
  }

  returnLending(rawId: unknown): Promise<LendingTransaction> {
    return this.lendings.returnLending(rawId);
  }
}
