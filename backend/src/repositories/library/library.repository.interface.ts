import type {
  Book,
  BookQuery,
  CreateBookInput,
  LendingItem,
  LendingTransaction,
  UpdateBookInput,
} from '../../../../shared/library';

export const MAX_BOOK_STOCK = 10000;

export interface CreateLendingRecordInput {
  referenceCode: string;
  borrowerName: string;
  borrowerPhone: string;
  dueDate: string;
  items: LendingItem[];
  totalCopies: number;
}

export interface ILibraryRepository {
  readonly storageEngine: 'mongodb' | 'local-json' | 'memory';
  findBooks(query: BookQuery): Promise<Book[]>;
  findBookById(id: string): Promise<Book | null>;
  findBooksByIds(ids: string[]): Promise<Book[]>;
  createBook(input: CreateBookInput): Promise<Book>;
  updateBook(id: string, input: UpdateBookInput): Promise<Book | null>;
  deleteBook(id: string): Promise<boolean>;
  listGenres(): Promise<string[]>;
  findLendings(): Promise<LendingTransaction[]>;
  findLendingById(id: string): Promise<LendingTransaction | null>;
  createLendingWithStockDeduction(
    input: CreateLendingRecordInput
  ): Promise<LendingTransaction>;
  markLendingReturned(id: string): Promise<LendingTransaction | null>;
  countBooks(): Promise<number>;
  clearAll(): Promise<void>;
  seedInitialData(options?: { reset?: boolean }): Promise<{
    booksInserted: number;
    lendingsInserted: number;
  }>;
}
