import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type {
  Book,
  BookQuery,
  CreateBookInput,
  LendingItem,
  LendingTransaction,
  UpdateBookInput,
} from '../../../../shared/library';
import { INITIAL_BOOKS, INITIAL_LENDINGS } from '../../data';
import { AppError } from '../../errors';
import {
  addDaysIsoDate,
  daysAgoIsoTimestamp,
  sortAndFilterBooks,
} from './library.helpers';
import {
  MAX_BOOK_STOCK,
  type CreateLendingRecordInput,
  type ILibraryRepository,
} from './library.repository.interface';

interface LocalStoreData {
  books: Book[];
  lendings: LendingTransaction[];
}

export class LocalLibraryRepository implements ILibraryRepository {
  public readonly storageEngine: 'local-json' | 'memory';
  private readonly filePath: string | null;
  private data: LocalStoreData = { books: [], lendings: [] };

  constructor(options?: { filePath?: string; inMemoryOnly?: boolean }) {
    if (options?.inMemoryOnly) {
      this.storageEngine = 'memory';
      this.filePath = null;
    } else {
      this.storageEngine = 'local-json';
      this.filePath =
        options?.filePath ?? path.resolve(process.cwd(), 'data', 'library-store.json');
      this.loadFromDisk();
    }
  }

  private loadFromDisk(): void {
    if (!this.filePath) return;
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        const parsed = JSON.parse(raw) as Partial<LocalStoreData>;
        this.data = {
          books: Array.isArray(parsed.books) ? parsed.books : [],
          lendings: Array.isArray(parsed.lendings) ? parsed.lendings : [],
        };
      }
    } catch {
      this.data = { books: [], lendings: [] };
    }
  }

  private saveToDisk(): void {
    if (!this.filePath) return;
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), 'utf-8');
  }

  async findBooks(query: BookQuery): Promise<Book[]> {
    return sortAndFilterBooks(this.data.books, query).map((b) => ({ ...b }));
  }

  async findBookById(id: string): Promise<Book | null> {
    const found = this.data.books.find((b) => b.id === id);
    return found ? { ...found } : null;
  }

  async findBooksByIds(ids: string[]): Promise<Book[]> {
    const idSet = new Set(ids);
    return this.data.books.filter((b) => idSet.has(b.id)).map((b) => ({ ...b }));
  }

  async createBook(input: CreateBookInput): Promise<Book> {
    const now = new Date().toISOString();
    const book: Book = {
      id: crypto.randomBytes(12).toString('hex'),
      title: input.title,
      author: input.author,
      genre: input.genre,
      stock: input.stock,
      publishedYear: input.publishedYear,
      isbn: input.isbn,
      coverImage: input.coverImage,
      description: input.description,
      publisher: input.publisher,
      pages: input.pages,
      shelfLocation: input.shelfLocation,
      language: input.language,
      createdAt: now,
      updatedAt: now,
    };
    this.data.books.push(book);
    this.saveToDisk();
    return { ...book };
  }

  async updateBook(id: string, input: UpdateBookInput): Promise<Book | null> {
    const index = this.data.books.findIndex((b) => b.id === id);
    if (index === -1) return null;

    const existing = this.data.books[index];
    if (input.stock !== undefined && input.expectedStock !== existing.stock) {
      throw new AppError(
        409,
        'Stock changed since this book was opened. Refresh before saving.'
      );
    }
    const updated: Book = {
      id: existing.id,
      title: input.title,
      author: input.author,
      genre: input.genre,
      stock: input.stock ?? existing.stock,
      publishedYear: input.publishedYear,
      isbn: input.isbn,
      coverImage: input.coverImage,
      description: input.description,
      publisher: input.publisher,
      pages: input.pages,
      shelfLocation: input.shelfLocation,
      language: input.language,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
    };
    this.data.books[index] = updated;
    this.saveToDisk();
    return { ...updated };
  }

  async deleteBook(id: string): Promise<boolean> {
    const index = this.data.books.findIndex((b) => b.id === id);
    if (index === -1) return false;
    const hasActiveLoan = this.data.lendings.some(
      (l) => l.status === 'Active' && l.items.some((item) => item.bookId === id)
    );
    if (hasActiveLoan) {
      throw new AppError(
        409,
        'Cannot delete a book while copies are currently lent out. Return active loans first.'
      );
    }
    this.data.books.splice(index, 1);
    this.saveToDisk();
    return true;
  }

  async listGenres(): Promise<string[]> {
    const genres = new Set<string>();
    for (const book of this.data.books) {
      if (book.genre.trim().length > 0) {
        genres.add(book.genre);
      }
    }
    return Array.from(genres).sort((a, b) => a.localeCompare(b));
  }

  async findLendings(): Promise<LendingTransaction[]> {
    return [...this.data.lendings]
      .sort((a, b) => new Date(b.lentAt).getTime() - new Date(a.lentAt).getTime())
      .map((l) => ({ ...l, items: l.items.map((item) => ({ ...item })) }));
  }

  async findLendingById(id: string): Promise<LendingTransaction | null> {
    const found = this.data.lendings.find((l) => l.id === id);
    return found ? { ...found, items: found.items.map((item) => ({ ...item })) } : null;
  }

  async createLendingWithStockDeduction(
    input: CreateLendingRecordInput
  ): Promise<LendingTransaction> {
    // Validate all books have sufficient stock before mutating anything
    for (const item of input.items) {
      const book = this.data.books.find((b) => b.id === item.bookId);
      if (!book) {
        throw new AppError(404, `Book "${item.bookTitle}" was not found.`);
      }
      if (book.stock < item.quantity) {
        throw new AppError(
          409,
          `Insufficient stock for "${book.title}". Available: ${book.stock}, requested: ${item.quantity}.`
        );
      }
    }

    const now = new Date().toISOString();
    const sortedItems = [...input.items].sort((a, b) => a.bookId.localeCompare(b.bookId));
    const lockedItems: LendingItem[] = [];
    for (const item of sortedItems) {
      const book = this.data.books.find((b) => b.id === item.bookId)!;
      book.stock -= item.quantity;
      book.updatedAt = now;
      lockedItems.push({
        bookId: book.id,
        bookTitle: book.title,
        author: book.author,
        genre: book.genre,
        quantity: item.quantity,
      });
    }

    const transaction: LendingTransaction = {
      id: crypto.randomBytes(12).toString('hex'),
      referenceCode: input.referenceCode,
      borrowerName: input.borrowerName,
      borrowerPhone: input.borrowerPhone,
      dueDate: input.dueDate,
      lentAt: now,
      returnedAt: null,
      status: 'Active',
      items: lockedItems,
      totalCopies: input.totalCopies,
    };

    this.data.lendings.unshift(transaction);
    this.saveToDisk();
    return { ...transaction };
  }

  async markLendingReturned(id: string): Promise<LendingTransaction | null> {
    const lending = this.data.lendings.find((l) => l.id === id);
    if (!lending || lending.status !== 'Active') {
      return null;
    }

    const now = new Date().toISOString();
    lending.status = 'Returned';
    lending.returnedAt = now;

    for (const item of lending.items) {
      const book = this.data.books.find((b) => b.id === item.bookId);
      if (book) {
        book.stock = Math.min(MAX_BOOK_STOCK, book.stock + item.quantity);
        book.updatedAt = now;
      }
    }

    this.saveToDisk();
    return { ...lending };
  }

  async countBooks(): Promise<number> {
    return this.data.books.length;
  }

  async clearAll(): Promise<void> {
    this.data = { books: [], lendings: [] };
    this.saveToDisk();
  }

  async seedInitialData(options?: { reset?: boolean }): Promise<{
    booksInserted: number;
    lendingsInserted: number;
  }> {
    if (options?.reset) {
      this.data = { books: [], lendings: [] };
    }
    if (this.data.books.length > 0) {
      return { booksInserted: 0, lendingsInserted: 0 };
    }
    const now = new Date();
    const createdBooks: Book[] = [];
    for (const seedBook of INITIAL_BOOKS) {
      createdBooks.push(await this.createBook(seedBook));
    }
    const byTitle = new Map(createdBooks.map((b) => [b.title, b]));
    let lendingsInserted = 0;

    for (let i = 0; i < INITIAL_LENDINGS.length; i++) {
      const seed = INITIAL_LENDINGS[i];
      const items: LendingItem[] = [];
      for (const entry of seed.bookTitles) {
        const book = byTitle.get(entry.title);
        if (!book) continue;
        items.push({
          bookId: book.id,
          bookTitle: book.title,
          author: book.author,
          genre: book.genre,
          quantity: entry.quantity,
        });
      }
      if (items.length === 0) continue;

      this.data.lendings.push({
        id: crypto.randomBytes(12).toString('hex'),
        referenceCode: `MCL-${String(1001 + i)}`,
        borrowerName: seed.borrowerName,
        borrowerPhone: seed.borrowerPhone,
        dueDate: addDaysIsoDate(now, seed.daysOffsetFromNow),
        lentAt: daysAgoIsoTimestamp(now, seed.lentDaysAgo),
        returnedAt: seed.status === 'Returned' ? daysAgoIsoTimestamp(now, 4) : null,
        status: seed.status,
        items,
        totalCopies: items.reduce((sum, item) => sum + item.quantity, 0),
      });
      lendingsInserted++;
    }
    this.saveToDisk();
    return { booksInserted: createdBooks.length, lendingsInserted };
  }
}
