import mongoose from 'mongoose';
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
import { BookModel, toBookDTO } from '../../models/book.model';
import { LendingModel, toLendingDTO } from '../../models/lending.model';
import { escapeRegex } from '../../utils/validation/primitives';
import {
  addDaysIsoDate,
  daysAgoIsoTimestamp,
  isUnsupportedTransactionError,
} from './library.helpers';
import {
  MAX_BOOK_STOCK,
  type CreateLendingRecordInput,
  type ILibraryRepository,
} from './library.repository.interface';

export class MongoLibraryRepository implements ILibraryRepository {
  public readonly storageEngine = 'mongodb' as const;

  private async withTransaction<T>(
    work: (session: mongoose.ClientSession) => Promise<T>
  ): Promise<T> {
    const session = await mongoose.startSession();
    try {
      return await session.withTransaction(() => work(session));
    } catch (error) {
      if (isUnsupportedTransactionError(error)) {
        throw new AppError(503, 'Database transactions require a MongoDB replica set.');
      }
      throw error;
    } finally {
      await session.endSession();
    }
  }

  async findBooks(query: BookQuery): Promise<Book[]> {
    const filter: Record<string, unknown> = {};

    if (query.genre && query.genre !== 'All') {
      filter.genre = { $eq: query.genre };
    }

    if (query.search && query.search.trim().length > 0) {
      const regex = new RegExp(escapeRegex(query.search.trim()), 'i');
      filter.$or = [
        { title: regex },
        { author: regex },
        { genre: regex },
        { isbn: regex },
      ];
    }

    const sortField = query.sortBy === 'stock' ? 'stock' : 'title';
    const sortDir = query.sortOrder === 'desc' ? -1 : 1;
    const sortSpec: Record<string, 1 | -1> =
      sortField === 'stock' ? { stock: sortDir, title: 1 } : { title: sortDir };

    const docs = await BookModel.find(filter)
      .collation({ locale: 'en', strength: 2 })
      .sort(sortSpec)
      .lean();

    return docs.map(toBookDTO);
  }

  async findBookById(id: string): Promise<Book | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return null;
    }
    const doc = await BookModel.findById(id).lean();
    return doc ? toBookDTO(doc) : null;
  }

  async findBooksByIds(ids: string[]): Promise<Book[]> {
    const validIds = ids.filter((id) => mongoose.Types.ObjectId.isValid(id));
    if (validIds.length === 0) return [];
    const docs = await BookModel.find({ _id: { $in: validIds } }).lean();
    return docs.map(toBookDTO);
  }

  async createBook(input: CreateBookInput): Promise<Book> {
    const created = await BookModel.create({
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
    });
    return toBookDTO(created.toObject());
  }

  async updateBook(id: string, input: UpdateBookInput): Promise<Book | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return null;
    }

    const setFields: Record<string, unknown> = {
      title: input.title,
      author: input.author,
      genre: input.genre,
      ...(input.stock !== undefined ? { stock: input.stock } : {}),
    };
    const unsetFields: Record<string, 1> = {};

    const optionalFields: Array<
      keyof Pick<
        UpdateBookInput,
        | 'publishedYear'
        | 'isbn'
        | 'coverImage'
        | 'description'
        | 'publisher'
        | 'pages'
        | 'shelfLocation'
        | 'language'
      >
    > = [
      'publishedYear',
      'isbn',
      'coverImage',
      'description',
      'publisher',
      'pages',
      'shelfLocation',
      'language',
    ];

    for (const key of optionalFields) {
      const value = input[key];
      if (value === undefined) {
        unsetFields[key] = 1;
      } else {
        setFields[key] = value;
      }
    }

    const updateDoc: Record<string, unknown> = { $set: setFields };
    if (Object.keys(unsetFields).length > 0) {
      updateDoc.$unset = unsetFields;
    }

    const filter: Record<string, unknown> = { _id: id };
    if (input.stock !== undefined) filter.stock = input.expectedStock;
    const updated = await BookModel.findOneAndUpdate(filter, updateDoc, {
      new: true,
      runValidators: true,
    }).lean();
    if (!updated && input.stock !== undefined && (await BookModel.exists({ _id: id }))) {
      throw new AppError(
        409,
        'Stock changed since this book was opened. Refresh before saving.'
      );
    }
    return updated ? toBookDTO(updated) : null;
  }

  async deleteBook(id: string): Promise<boolean> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return false;
    }
    return this.withTransaction(async (session) => {
      const deleted = await BookModel.findByIdAndDelete(id, { session }).lean();
      if (!deleted) {
        return false;
      }
      const activeLoan = await LendingModel.exists({
        status: 'Active',
        'items.bookId': id,
      }).session(session);
      if (activeLoan) {
        throw new AppError(
          409,
          'Cannot delete a book while copies are currently lent out. Return active loans first.'
        );
      }
      return true;
    });
  }

  async listGenres(): Promise<string[]> {
    const genres = await BookModel.distinct('genre');
    return genres
      .filter((g): g is string => typeof g === 'string' && g.trim().length > 0)
      .sort((a, b) => a.localeCompare(b));
  }

  async findLendings(): Promise<LendingTransaction[]> {
    const docs = await LendingModel.find().sort({ lentAt: -1 }).lean();
    return docs.map(toLendingDTO);
  }

  async findLendingById(id: string): Promise<LendingTransaction | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return null;
    }
    const doc = await LendingModel.findById(id).lean();
    return doc ? toLendingDTO(doc) : null;
  }

  async createLendingWithStockDeduction(
    input: CreateLendingRecordInput
  ): Promise<LendingTransaction> {
    const sortedItems = [...input.items].sort((a, b) => a.bookId.localeCompare(b.bookId));
    return this.withTransaction(async (session) => {
      const lockedItems: LendingItem[] = [];
      for (const item of sortedItems) {
        if (!mongoose.Types.ObjectId.isValid(item.bookId)) {
          throw new AppError(404, `Book "${item.bookTitle}" was not found.`);
        }
        const updated = await BookModel.findOneAndUpdate(
          { _id: item.bookId, stock: { $gte: item.quantity } },
          { $inc: { stock: -item.quantity } },
          { new: true, session }
        ).lean();

        if (!updated) {
          throw new AppError(
            409,
            `Insufficient stock for "${item.bookTitle}". Please refresh and check available copies.`
          );
        }

        lockedItems.push({
          bookId: item.bookId,
          bookTitle: updated.title ?? item.bookTitle,
          author: updated.author ?? item.author,
          genre: updated.genre ?? item.genre,
          quantity: item.quantity,
        });
      }

      const [created] = await LendingModel.create(
        [
          {
            referenceCode: input.referenceCode,
            borrowerName: input.borrowerName,
            borrowerPhone: input.borrowerPhone,
            dueDate: input.dueDate,
            lentAt: new Date(),
            returnedAt: null,
            status: 'Active',
            items: lockedItems,
            totalCopies: input.totalCopies,
          },
        ],
        { session }
      );

      return toLendingDTO(created.toObject());
    });
  }

  async markLendingReturned(id: string): Promise<LendingTransaction | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return null;
    }
    return this.withTransaction(async (session) => {
      const updated = await LendingModel.findOneAndUpdate(
        { _id: id, status: 'Active' },
        { $set: { status: 'Returned', returnedAt: new Date() } },
        { new: true, session }
      ).lean();

      if (!updated) return null;

      const sortedItems = [...updated.items].sort((a, b) =>
        String(a.bookId).localeCompare(String(b.bookId))
      );
      for (const item of sortedItems) {
        if (mongoose.Types.ObjectId.isValid(item.bookId)) {
          await BookModel.findByIdAndUpdate(
            item.bookId,
            [
              {
                $set: {
                  stock: {
                    $min: [MAX_BOOK_STOCK, { $add: ['$stock', item.quantity] }],
                  },
                },
              },
            ],
            { session, updatePipeline: true }
          );
        }
      }

      return toLendingDTO(updated);
    });
  }

  async countBooks(): Promise<number> {
    return BookModel.countDocuments();
  }

  async clearAll(): Promise<void> {
    await Promise.all([BookModel.deleteMany({}), LendingModel.deleteMany({})]);
  }

  async seedInitialData(options?: { reset?: boolean }): Promise<{
    booksInserted: number;
    lendingsInserted: number;
  }> {
    if (options?.reset) {
      await this.clearAll();
    }

    const existingCount = await BookModel.countDocuments();
    if (existingCount > 0) {
      return { booksInserted: 0, lendingsInserted: 0 };
    }

    const insertedBooks = await BookModel.insertMany(INITIAL_BOOKS);
    const byTitle = new Map(insertedBooks.map((b) => [b.title, toBookDTO(b.toObject())]));
    const now = new Date();
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

      const totalCopies = items.reduce((sum, item) => sum + item.quantity, 0);
      const lentAt = new Date(daysAgoIsoTimestamp(now, seed.lentDaysAgo));
      const returnedAt =
        seed.status === 'Returned' ? new Date(daysAgoIsoTimestamp(now, 4)) : null;

      await LendingModel.create({
        referenceCode: `MCL-${String(1001 + i)}`,
        borrowerName: seed.borrowerName,
        borrowerPhone: seed.borrowerPhone,
        dueDate: addDaysIsoDate(now, seed.daysOffsetFromNow),
        lentAt,
        returnedAt,
        status: seed.status,
        items,
        totalCopies,
      });
      lendingsInserted++;
    }

    return { booksInserted: insertedBooks.length, lendingsInserted };
  }
}
