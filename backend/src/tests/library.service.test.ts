import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import test from 'node:test';
import {
  createMongoDatabaseManager,
  getMongoConnectOptions,
  isConfiguredMongoUri,
} from '../config/database';
import { AppError } from '../errors';
import { LocalLibraryRepository, MongoLibraryRepository } from '../repositories/library';
import { BookModel } from '../models/book.model';
import { LendingModel } from '../models/lending.model';
import { LibraryService } from '../services/library.service';

const TEST_FIXTURE_BOOKS = [
  {
    title: 'A Brief History of Time',
    author: 'Stephen Hawking',
    genre: 'Science',
    stock: 6,
    publishedYear: 1988,
    isbn: '978-0553380163',
    coverImage: '/src/assets/images/cover_cosmos_science_1795275511864.jpg',
  },
  {
    title: 'Atomic Habits',
    author: 'James Clear',
    genre: 'Non-Fiction',
    stock: 9,
    publishedYear: 2018,
    isbn: '978-0735211292',
  },
  {
    title: 'Clean Code',
    author: 'Robert C. Martin',
    genre: 'Technology',
    stock: 4,
    publishedYear: 2008,
    isbn: '978-0132350884',
  },
  {
    title: 'Pachinko',
    author: 'Min Jin Lee',
    genre: 'Fiction',
    stock: 8,
    publishedYear: 2017,
    isbn: '978-1455563920',
  },
  {
    title: 'Sapiens: A Brief History of Humankind',
    author: 'Yuval Noah Harari',
    genre: 'History',
    stock: 11,
    publishedYear: 2015,
    isbn: '978-0062316097',
  },
  {
    title: 'The Pragmatic Programmer',
    author: 'David Thomas & Andrew Hunt',
    genre: 'Technology',
    stock: 1,
    publishedYear: 2019,
    isbn: '978-0135957059',
  },
  {
    title: 'To Kill a Mockingbird',
    author: 'Harper Lee',
    genre: 'Fiction',
    stock: 5,
    publishedYear: 1960,
    isbn: '978-0060935467',
  },
];

async function createSeededService(): Promise<LibraryService> {
  const repo = new LocalLibraryRepository({ inMemoryOnly: true });
  const service = new LibraryService(repo);
  for (const book of TEST_FIXTURE_BOOKS) {
    await service.addBook(book);
  }
  return service;
}

test('Database config detects valid MongoDB Atlas URIs and sets default dbName when omitted', () => {
  assert.equal(isConfiguredMongoUri(undefined), false);
  assert.equal(
    isConfiguredMongoUri(
      'mongodb+srv://<db_username>:<db_password>@cluster1.example.mongodb.net/'
    ),
    false
  );
  assert.equal(
    isConfiguredMongoUri('mongodb+srv://user:secret@cluster1.example.mongodb.net/'),
    true
  );

  const withoutPathOpts = getMongoConnectOptions(
    'mongodb+srv://user:secret@cluster1.example.mongodb.net/'
  );
  assert.equal(withoutPathOpts.dbName, 'meis_community_library');

  const withPathOpts = getMongoConnectOptions(
    'mongodb+srv://user:secret@cluster1.example.mongodb.net/custom_library?retryWrites=true'
  );
  assert.equal(withPathOpts.dbName, undefined);

  const multiHost = getMongoConnectOptions(
    'mongodb://host-a:27017,host-b:27017/library?replicaSet=rs0',
    'other_database'
  );
  assert.equal(multiHost.dbName, undefined);
  assert.equal(
    getMongoConnectOptions(
      'mongodb://host-a:27017,host-b:27017/?replicaSet=rs0',
      'custom'
    ).dbName,
    'custom'
  );
});

test('Connecting the database does not seed sample records', async (t) => {
  const previousUri = process.env.MONGODB_URI;
  let seeded = false;
  t.mock.method(mongoose, 'connect', async () => mongoose);
  t.mock.method(MongoLibraryRepository.prototype, 'seedInitialData', async () => {
    seeded = true;
    return { booksInserted: 0, lendingsInserted: 0 };
  });
  t.mock.method(MongoLibraryRepository.prototype, 'countBooks', async () => 0);
  process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/test';
  try {
    await createMongoDatabaseManager().ensureConnected();
    assert.equal(seeded, false);
  } finally {
    if (previousUri === undefined) delete process.env.MONGODB_URI;
    else process.env.MONGODB_URI = previousUri;
  }
});

test('LibraryService lists books and filters by genre', async () => {
  const service = await createSeededService();

  const allBooks = await service.listBooks({});
  assert.equal(allBooks.length, TEST_FIXTURE_BOOKS.length);

  const fictionBooks = await service.listBooks({ genre: 'Fiction' });
  assert.equal(fictionBooks.length, 2);
  assert.ok(fictionBooks.every((b) => b.genre === 'Fiction'));
});

test('LibraryService sorts books by title and by stock ascending/descending', async () => {
  const service = await createSeededService();

  const byTitleDesc = await service.listBooks({ sortBy: 'title', sortOrder: 'desc' });
  assert.equal(byTitleDesc[0].title, 'To Kill a Mockingbird');

  const byStockAsc = await service.listBooks({ sortBy: 'stock', sortOrder: 'asc' });
  assert.equal(byStockAsc[0].stock, 1);
  assert.ok(byStockAsc[0].stock <= byStockAsc[byStockAsc.length - 1].stock);

  const byStockDesc = await service.listBooks({ sortBy: 'stock', sortOrder: 'desc' });
  assert.equal(byStockDesc[0].stock, 11);
  assert.ok(byStockDesc[0].stock >= byStockDesc[byStockDesc.length - 1].stock);
});

test('LibraryService adds and removes a book with validation', async () => {
  const service = await createSeededService();

  await assert.rejects(
    () => service.addBook({ title: '', author: '', genre: '', stock: -1 }),
    (err: unknown) => err instanceof AppError && err.statusCode === 400
  );

  // Rejects NoSQL-style object injection in string fields
  await assert.rejects(
    () =>
      service.addBook({
        title: { $ne: '' },
        author: 'Test',
        genre: 'Fiction',
        stock: 2,
      }),
    (err: unknown) => err instanceof AppError && err.statusCode === 400
  );

  const added = await service.addBook({
    title: 'The Midnight Library',
    author: 'Matt Haig',
    genre: 'Fiction',
    stock: 5,
    publishedYear: 2020,
  });

  assert.equal(added.title, 'The Midnight Library');
  assert.equal(added.stock, 5);

  const afterAdd = await service.listBooks({});
  assert.equal(afterAdd.length, TEST_FIXTURE_BOOKS.length + 1);

  await service.removeBook(added.id);
  const afterRemove = await service.listBooks({});
  assert.equal(afterRemove.length, TEST_FIXTURE_BOOKS.length);

  await assert.rejects(
    () => service.removeBook(added.id),
    (err: unknown) => err instanceof AppError && err.statusCode === 404
  );
});

test('LibraryService builds multi-book lending preview and subtracts stock on confirmation', async () => {
  const service = await createSeededService();
  const books = await service.listBooks({ sortBy: 'title', sortOrder: 'asc' });
  const atomicHabits = books.find((b) => b.title === 'Atomic Habits')!;
  const cleanCode = books.find((b) => b.title === 'Clean Code')!;

  const payload = {
    borrowerName: 'Rina Kusuma',
    borrowerPhone: '+62 812-3456-7890',
    dueDate: '2026-12-10',
    items: [
      { bookId: atomicHabits.id, quantity: 2 },
      { bookId: cleanCode.id, quantity: 1 },
    ],
  };

  // Preview computes remaining stock without mutating catalog
  const preview = await service.previewLending(payload);
  assert.equal(preview.totalTitles, 2);
  assert.equal(preview.totalCopies, 3);
  assert.equal(preview.items[0].remainingStock, atomicHabits.stock - 2);
  assert.equal(preview.items[1].remainingStock, cleanCode.stock - 1);

  const booksBeforeConfirm = await service.listBooks({});
  assert.equal(
    booksBeforeConfirm.find((b) => b.id === atomicHabits.id)!.stock,
    atomicHabits.stock
  );

  // Confirm lending subtracts stock and records history
  const tx = await service.createLending(payload);
  assert.equal(tx.borrowerName, 'Rina Kusuma');
  assert.equal(tx.totalCopies, 3);
  assert.equal(tx.status, 'Active');

  const booksAfterConfirm = await service.listBooks({});
  assert.equal(
    booksAfterConfirm.find((b) => b.id === atomicHabits.id)!.stock,
    atomicHabits.stock - 2
  );
  assert.equal(
    booksAfterConfirm.find((b) => b.id === cleanCode.id)!.stock,
    cleanCode.stock - 1
  );

  const history = await service.listLendings();
  assert.equal(history[0].id, tx.id);

  // Returning restores stock
  const returned = await service.returnLending(tx.id);
  assert.equal(returned.status, 'Returned');

  const booksAfterReturn = await service.listBooks({});
  assert.equal(
    booksAfterReturn.find((b) => b.id === atomicHabits.id)!.stock,
    atomicHabits.stock
  );
  assert.equal(
    booksAfterReturn.find((b) => b.id === cleanCode.id)!.stock,
    cleanCode.stock
  );
});

test('LibraryService applies the quantity limit after combining duplicate books', async () => {
  const service = await createSeededService();
  const book = await service.addBook({
    title: 'Bulk copies',
    author: 'Author',
    genre: 'Fiction',
    stock: 150,
  });
  const payload = {
    borrowerName: 'Rina Kusuma',
    borrowerPhone: '+62 812-3456-7890',
    dueDate: '2026-12-10',
    items: [
      { bookId: book.id, quantity: 60 },
      { bookId: book.id, quantity: 40 },
    ],
  };

  assert.equal((await service.previewLending(payload)).items[0].quantity, 100);
  const excess = {
    ...payload,
    items: [
      { bookId: book.id, quantity: 60 },
      { bookId: book.id, quantity: 41 },
    ],
  };
  await assert.rejects(
    () => service.previewLending(excess),
    (err: unknown) => err instanceof AppError && err.statusCode === 400
  );
  await assert.rejects(
    () => service.createLending(excess),
    (err: unknown) => err instanceof AppError && err.statusCode === 400
  );
  assert.equal((await service.getBookById(book.id)).stock, 150);
  assert.equal((await service.listLendings()).length, 0);
});

test('LibraryService rejects stale stock edits while allowing metadata-only updates', async () => {
  const service = await createSeededService();
  const book = (await service.listBooks({}))[0];
  const metadata = { title: 'Revised title', author: book.author, genre: book.genre };

  await service.createLending({
    borrowerName: 'Rina Kusuma',
    borrowerPhone: '+62 812-3456-7890',
    dueDate: '2026-12-10',
    items: [{ bookId: book.id, quantity: 1 }],
  });

  await assert.rejects(
    () =>
      service.updateBook(book.id, {
        ...metadata,
        stock: book.stock,
        expectedStock: book.stock,
      }),
    (err: unknown) => err instanceof AppError && err.statusCode === 409
  );
  await assert.rejects(
    () => service.updateBook(book.id, { ...metadata, stock: book.stock }),
    (err: unknown) => err instanceof AppError && err.statusCode === 400
  );
  await assert.rejects(
    () =>
      service.updateBook(book.id, { ...metadata, stock: book.stock, expectedStock: -1 }),
    (err: unknown) => err instanceof AppError && err.statusCode === 400
  );

  const updated = await service.updateBook(book.id, metadata);
  assert.equal(updated.title, 'Revised title');
  assert.equal(updated.stock, book.stock - 1);
  const adjusted = await service.updateBook(book.id, {
    ...metadata,
    stock: book.stock + 1,
    expectedStock: book.stock - 1,
  });
  assert.equal(adjusted.stock, book.stock + 1);
});

test('LibraryService rejects lending when requested quantity exceeds stock', async () => {
  const service = await createSeededService();
  const books = await service.listBooks({});
  const lowStockBook = books.find((b) => b.stock === 1)!;

  await assert.rejects(
    () =>
      service.createLending({
        borrowerName: 'Budi Santoso',
        borrowerPhone: '+62 811-1234-5678',
        dueDate: '2026-12-15',
        items: [{ bookId: lowStockBook.id, quantity: 3 }],
      }),
    (err: unknown) => err instanceof AppError && err.statusCode === 409
  );
});

test('LibraryService updates book details with photo and blocks unsafe cover URLs', async () => {
  const service = await createSeededService();
  const books = await service.listBooks({ sortBy: 'title', sortOrder: 'asc' });
  const target = books[0];

  const fetched = await service.getBookById(target.id);
  assert.equal(fetched.title, target.title);
  assert.ok(fetched.coverImage);

  // Rejects javascript: and SVG data URLs
  await assert.rejects(
    () =>
      service.updateBook(target.id, {
        title: target.title,
        author: target.author,
        genre: target.genre,
        stock: target.stock,
        expectedStock: target.stock,
        coverImage: 'javascript:alert(1)',
      }),
    (err: unknown) => err instanceof AppError && err.statusCode === 400
  );

  await assert.rejects(
    () =>
      service.updateBook(target.id, {
        title: target.title,
        author: target.author,
        genre: target.genre,
        stock: target.stock,
        expectedStock: target.stock,
        coverImage: 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=',
      }),
    (err: unknown) => err instanceof AppError && err.statusCode === 400
  );

  const updated = await service.updateBook(target.id, {
    title: 'A Brief History of Time (Illustrated Edition)',
    author: target.author,
    genre: target.genre,
    stock: 8,
    expectedStock: target.stock,
    publishedYear: 1996,
    isbn: target.isbn,
    publisher: 'Bantam Doubleday',
    pages: 256,
    shelfLocation: 'Aisle C · Shelf 2',
    language: 'English',
    description: 'Expanded illustrated edition with updated cosmology notes.',
    coverImage: 'data:image/jpeg;base64,/9j/4AAQSkZJRg==',
  });

  assert.equal(updated.title, 'A Brief History of Time (Illustrated Edition)');
  assert.equal(updated.stock, 8);
  assert.equal(updated.pages, 256);
  assert.equal(updated.shelfLocation, 'Aisle C · Shelf 2');
  assert.equal(updated.coverImage, 'data:image/jpeg;base64,/9j/4AAQSkZJRg==');

  await assert.rejects(
    () =>
      service.updateBook('non-existent-id', {
        title: 'Unknown',
        author: 'Nobody',
        genre: 'Fiction',
        stock: 1,
        expectedStock: 1,
      }),
    (err: unknown) => err instanceof AppError && err.statusCode === 404
  );
});

test('MongoDB lending binds writes to a transaction and propagates failures', async (t) => {
  const events: string[] = [];
  const failure = new Error('injected write failure');
  const session = {
    withTransaction: async <T>(work: () => Promise<T>): Promise<T> => {
      events.push('begin');
      try {
        const result = await work();
        events.push('commit');
        return result;
      } catch (error) {
        events.push('abort');
        throw error;
      }
    },
    endSession: async () => {
      events.push('end');
    },
  } as unknown as mongoose.mongo.ClientSession;
  t.mock.method(mongoose, 'startSession', async () => session);
  t.mock.method(BookModel, 'findOneAndUpdate', ((
    _filter: unknown,
    _update: unknown,
    options: { session: unknown }
  ) => {
    assert.equal(options.session, session);
    events.push('deduct');
    return { lean: async () => ({ stock: 1 }) };
  }) as unknown as typeof BookModel.findOneAndUpdate);
  t.mock.method(LendingModel, 'create', (async (
    _docs: unknown,
    options: { session: unknown }
  ) => {
    assert.equal(options.session, session);
    events.push('create');
    throw failure;
  }) as unknown as typeof LendingModel.create);

  const repository = new MongoLibraryRepository();
  const bookId = new mongoose.Types.ObjectId().toString();
  await assert.rejects(
    () =>
      repository.createLendingWithStockDeduction({
        referenceCode: 'MCL-failure',
        borrowerName: 'Rina Kusuma',
        borrowerPhone: '+62 812-3456-7890',
        dueDate: '2026-12-10',
        items: [
          { bookId, bookTitle: 'First', author: 'Author', genre: 'Fiction', quantity: 1 },
        ],
        totalCopies: 1,
      }),
    (error: unknown) => error === failure
  );
  assert.deepEqual(events, ['begin', 'deduct', 'create', 'abort', 'end']);

  events.length = 0;
  t.mock.method(LendingModel, 'findOneAndUpdate', ((
    _filter: unknown,
    _update: unknown,
    options: { session: unknown }
  ) => {
    assert.equal(options.session, session);
    events.push('return');
    return { lean: async () => ({ items: [{ bookId, quantity: 1 }] }) };
  }) as unknown as typeof LendingModel.findOneAndUpdate);
  t.mock.method(BookModel, 'findByIdAndUpdate', (async (
    _id: unknown,
    _update: unknown,
    options: { session: unknown }
  ) => {
    assert.equal(options.session, session);
    events.push('restore');
    throw failure;
  }) as unknown as typeof BookModel.findByIdAndUpdate);
  await assert.rejects(
    () => repository.markLendingReturned(new mongoose.Types.ObjectId().toString()),
    (error: unknown) => error === failure
  );
  assert.deepEqual(events, ['begin', 'return', 'restore', 'abort', 'end']);
});

async function withMongoTestDatabase(
  uri: string,
  run: (repository: MongoLibraryRepository) => Promise<void>
): Promise<void> {
  const databaseName = `meis_test_${randomUUID().replaceAll('-', '')}`;
  const match = /^(mongodb(?:\+srv)?:\/\/[^/?]+)(?:\/[^?]*)?(\?.*)?$/.exec(uri);
  assert.ok(match, 'MongoDB test URI must be valid');
  const previousUri = process.env.MONGODB_URI;
  const previousDbName = process.env.MONGODB_DB_NAME;
  process.env.MONGODB_URI = `${match[1]}/${databaseName}${match[2] ?? ''}`;
  process.env.MONGODB_DB_NAME = databaseName;

  try {
    const manager = createMongoDatabaseManager();
    const state = await manager.ensureConnected();
    assert.equal(state.connected, true, state.lastError ?? undefined);
    assert.equal(mongoose.connection.name, databaseName);
    await run(manager.repository as MongoLibraryRepository);
  } finally {
    try {
      if (
        mongoose.connection.readyState === 1 &&
        mongoose.connection.name === databaseName
      ) {
        await mongoose.connection.db!.dropDatabase();
      }
    } finally {
      try {
        await mongoose.disconnect();
      } finally {
        if (previousUri === undefined) delete process.env.MONGODB_URI;
        else process.env.MONGODB_URI = previousUri;
        if (previousDbName === undefined) delete process.env.MONGODB_DB_NAME;
        else process.env.MONGODB_DB_NAME = previousDbName;
      }
    }
  }
}

const replicaSetUri = process.env.MONGODB_TEST_URI;
test(
  'MongoDB lending transactions roll back failures and serialize stock changes',
  {
    skip: replicaSetUri
      ? false
      : 'Set MONGODB_TEST_URI to a disposable MongoDB replica set',
  },
  async () => {
    await withMongoTestDatabase(replicaSetUri!, async (repository) => {
      assert.equal(
        await repository.countBooks(),
        0,
        'Connecting must not seed sample books'
      );
      assert.deepEqual(
        await repository.findLendings(),
        [],
        'Connecting must not seed sample loans'
      );
      await Promise.all([BookModel.init(), LendingModel.init()]);

      const first = await repository.createBook({
        title: 'First',
        author: 'Author',
        genre: 'Fiction',
        stock: 5,
      });
      const second = await repository.createBook({
        title: 'Second',
        author: 'Author',
        genre: 'Fiction',
        stock: 5,
      });
      const item = (book: typeof first, quantity: number) => ({
        bookId: book.id,
        bookTitle: book.title,
        author: book.author,
        genre: book.genre,
        quantity,
      });
      const loan = {
        referenceCode: 'MCL-transaction-test',
        borrowerName: 'Rina Kusuma',
        borrowerPhone: '+62 812-3456-7890',
        dueDate: '2026-12-10',
        items: [item(first, 2), item(second, 3)],
        totalCopies: 5,
      };

      await assert.rejects(
        () =>
          repository.createLendingWithStockDeduction({
            ...loan,
            items: [item(first, 2), item(second, 6)],
          }),
        (err: unknown) => err instanceof AppError && err.statusCode === 409
      );
      assert.equal((await repository.findBookById(first.id))!.stock, 5);
      assert.equal((await repository.findBookById(second.id))!.stock, 5);
      assert.equal((await repository.findLendings()).length, 0);

      const created = await repository.createLendingWithStockDeduction(loan);
      await assert.rejects(
        () =>
          repository.createLendingWithStockDeduction({
            ...loan,
            items: [item(first, 1), item(second, 1)],
            totalCopies: 2,
          }),
        (err: unknown) =>
          typeof err === 'object' && err !== null && 'code' in err && err.code === 11000
      );
      assert.equal((await repository.findBookById(first.id))!.stock, 3);
      assert.equal((await repository.findBookById(second.id))!.stock, 2);
      assert.equal((await repository.findLendings()).length, 1);

      const service = new LibraryService(repository);
      await assert.rejects(
        () =>
          service.updateBook(first.id, {
            ...first,
            stock: first.stock,
            expectedStock: first.stock,
          }),
        (err: unknown) => err instanceof AppError && err.statusCode === 409
      );
      assert.equal((await repository.findBookById(first.id))!.stock, 3);

      const db = mongoose.connection.db!;
      await db.command({
        collMod: BookModel.collection.name,
        validator: {
          $or: [
            { _id: { $ne: new mongoose.Types.ObjectId(second.id) } },
            { stock: { $lte: 2 } },
          ],
        },
      });
      await assert.rejects(
        () => repository.markLendingReturned(created.id),
        (err: unknown) =>
          typeof err === 'object' && err !== null && 'code' in err && err.code === 121
      );
      assert.equal((await repository.findLendingById(created.id))!.status, 'Active');
      assert.equal((await repository.findBookById(first.id))!.stock, 3);
      assert.equal((await repository.findBookById(second.id))!.stock, 2);
      await db.command({ collMod: BookModel.collection.name, validator: {} });

      const returns = await Promise.all([
        repository.markLendingReturned(created.id),
        repository.markLendingReturned(created.id),
      ]);
      assert.equal(returns.filter(Boolean).length, 1);
      assert.equal((await repository.findBookById(first.id))!.stock, 5);
      assert.equal((await repository.findBookById(second.id))!.stock, 5);

      const competing = await Promise.allSettled(
        ['A', 'B'].map((suffix) =>
          repository.createLendingWithStockDeduction({
            ...loan,
            referenceCode: `MCL-competing-${suffix}`,
            items: [item(first, 4)],
            totalCopies: 4,
          })
        )
      );
      assert.equal(competing.filter((result) => result.status === 'fulfilled').length, 1);
      const rejected = competing.find((result) => result.status === 'rejected');
      assert.ok(
        rejected &&
          rejected.status === 'rejected' &&
          rejected.reason instanceof AppError &&
          rejected.reason.statusCode === 409
      );
      assert.equal((await repository.findBookById(first.id))!.stock, 1);
    });
  }
);

const standaloneUri = process.env.MONGODB_STANDALONE_TEST_URI;
test(
  'MongoDB lending refuses non-transactional standalone servers',
  {
    skip: standaloneUri
      ? false
      : 'Set MONGODB_STANDALONE_TEST_URI to a disposable standalone MongoDB server',
  },
  async () => {
    await withMongoTestDatabase(standaloneUri!, async (repository) => {
      const book = await repository.createBook({
        title: 'Standalone',
        author: 'Author',
        genre: 'Fiction',
        stock: 2,
      });
      await assert.rejects(
        () =>
          repository.createLendingWithStockDeduction({
            referenceCode: 'MCL-standalone',
            borrowerName: 'Rina Kusuma',
            borrowerPhone: '+62 812-3456-7890',
            dueDate: '2026-12-10',
            items: [
              {
                bookId: book.id,
                bookTitle: book.title,
                author: book.author,
                genre: book.genre,
                quantity: 1,
              },
            ],
            totalCopies: 1,
          }),
        (err: unknown) => err instanceof AppError && err.statusCode === 503
      );
      assert.equal((await repository.findBookById(book.id))!.stock, 2);
      assert.equal((await repository.findLendings()).length, 0);
    });
  }
);

test('previewLending rejects punctuation-only phone, impossible rollover date, and past due date', async () => {
  const service = await createSeededService();
  const books = await service.listBooks({});
  const bookId = books[0].id;
  await assert.rejects(
    () =>
      service.previewLending({
        borrowerName: 'Rina Kusuma',
        borrowerPhone: '-------',
        dueDate: '2026-02-31',
        items: [{ bookId, quantity: 1 }],
      }),
    (err: unknown) =>
      err instanceof AppError &&
      err.statusCode === 400 &&
      Boolean(err.fieldErrors?.borrowerPhone) &&
      Boolean(err.fieldErrors?.dueDate)
  );

  await assert.rejects(
    () =>
      service.previewLending({
        borrowerName: 'Rina Kusuma',
        borrowerPhone: '+62 812-3456-7890',
        dueDate: '2020-01-01',
        items: [{ bookId, quantity: 1 }],
      }),
    (err: unknown) =>
      err instanceof AppError &&
      err.statusCode === 400 &&
      !err.fieldErrors?.borrowerPhone &&
      Boolean(err.fieldErrors?.dueDate)
  );
});
test('LibraryService rejects control-whitespace phone, >100 items, >50 distinct books, and caps search length', async () => {
  const seenQueries: Array<string | undefined> = [];
  const repo = new LocalLibraryRepository({ inMemoryOnly: true });
  const origFindBooks = repo.findBooks.bind(repo);
  repo.findBooks = async (query) => {
    seenQueries.push(query.search);
    return origFindBooks(query);
  };
  const service = new LibraryService(repo);
  const first = await service.addBook({
    title: 'Alpha Book',
    author: 'Author A',
    genre: 'Fiction',
    stock: 100,
  });

  // Search query trimmed & capped to 200 chars
  await service.listBooks({ search: `  ${'a'.repeat(250)}  ` });
  assert.equal(seenQueries[0]?.length, 200);

  // Control whitespace (\t, \n, \r) rejected in phone while space accepted
  for (const badPhone of ['+62\t8123456789', '+62\n8123456789', '+62\r8123456789']) {
    await assert.rejects(
      () =>
        service.previewLending({
          borrowerName: 'Rina Kusuma',
          borrowerPhone: badPhone,
          dueDate: '2026-12-20',
          items: [{ bookId: first.id, quantity: 1 }],
        }),
      (err: unknown) =>
        err instanceof AppError &&
        err.statusCode === 400 &&
        Boolean(err.fieldErrors?.borrowerPhone)
    );
  }

  // >100 raw items rejected
  const tooManyRawItems = Array.from({ length: 101 }, () => ({
    bookId: first.id,
    quantity: 1,
  }));
  await assert.rejects(
    () =>
      service.previewLending({
        borrowerName: 'Rina Kusuma',
        borrowerPhone: '+62 812-3456-7890',
        dueDate: '2026-12-20',
        items: tooManyRawItems,
      }),
    (err: unknown) =>
      err instanceof AppError && err.statusCode === 400 && Boolean(err.fieldErrors?.items)
  );

  // >50 distinct books rejected
  const distinctIds: string[] = [first.id];
  for (let i = 0; i < 50; i++) {
    const b = await service.addBook({
      title: `Book ${i}`,
      author: 'Author',
      genre: 'Fiction',
      stock: 5,
    });
    distinctIds.push(b.id);
  }
  await assert.rejects(
    () =>
      service.previewLending({
        borrowerName: 'Rina Kusuma',
        borrowerPhone: '+62 812-3456-7890',
        dueDate: '2026-12-20',
        items: distinctIds.map((bookId) => ({ bookId, quantity: 1 })),
      }),
    (err: unknown) =>
      err instanceof AppError && err.statusCode === 400 && Boolean(err.fieldErrors?.items)
  );

  // LocalLibraryRepository caps returned stock at 10000
  const nearCap = await service.addBook({
    title: 'Near Cap Book',
    author: 'Author Cap',
    genre: 'Science',
    stock: 9999,
  });
  const lending = await service.createLending({
    borrowerName: 'Rina Kusuma',
    borrowerPhone: '+62 812-3456-7890',
    dueDate: '2026-12-20',
    items: [{ bookId: nearCap.id, quantity: 5 }],
  });
  await service.updateBook(nearCap.id, {
    title: nearCap.title,
    author: nearCap.author,
    genre: nearCap.genre,
    stock: 9999,
    expectedStock: 9994,
  });
  await service.returnLending(lending.id);
  const afterReturn = await service.getBookById(nearCap.id);
  assert.equal(afterReturn.stock, 10000);
});

test('MongoLibraryRepository transactional deleteBook, sorted lending snapshots, runValidators, stock cap, and code-20 503', async (t) => {
  const events: string[] = [];
  const session = {
    withTransaction: async <T>(work: () => Promise<T>): Promise<T> => {
      events.push('begin');
      try {
        const result = await work();
        events.push('commit');
        return result;
      } catch (error) {
        events.push('abort');
        throw error;
      }
    },
    endSession: async () => {
      events.push('end');
    },
  } as unknown as mongoose.mongo.ClientSession;
  t.mock.method(mongoose, 'startSession', async () => session);

  const repository = new MongoLibraryRepository();
  const idA = '650000000000000000000001';
  const idB = '650000000000000000000002';

  // 1. deleteBook deletes inside transaction, checks active loans with session, and aborts with 409 if active
  t.mock.method(BookModel, 'findByIdAndDelete', ((
    _id: unknown,
    opts: { session: unknown }
  ) => {
    assert.equal(opts.session, session);
    events.push('delete');
    return { lean: async () => ({ _id: idA }) };
  }) as unknown as typeof BookModel.findByIdAndDelete);
  t.mock.method(LendingModel, 'exists', ((filter: Record<string, unknown>) => {
    assert.equal(filter.status, 'Active');
    assert.equal(filter['items.bookId'], idA);
    return {
      session: async (s: unknown) => {
        assert.equal(s, session);
        events.push('check-active');
        return { _id: 'loan-1' };
      },
    };
  }) as unknown as typeof LendingModel.exists);

  await assert.rejects(
    () => repository.deleteBook(idA),
    (err: unknown) => err instanceof AppError && err.statusCode === 409
  );
  assert.deepEqual(events, ['begin', 'delete', 'check-active', 'abort', 'end']);

  // 2. createLendingWithStockDeduction sorts by bookId and snapshots locked book metadata
  const deductedIds: string[] = [];
  let createdItems: Array<{
    bookId: string;
    bookTitle: string;
    author: string;
    genre: string;
  }> = [];
  t.mock.method(BookModel, 'findOneAndUpdate', ((
    filter: { _id: string },
    _update: unknown,
    opts: { session?: unknown; runValidators?: boolean }
  ) => {
    if (opts.session) {
      deductedIds.push(filter._id);
      return {
        lean: async () => ({
          _id: filter._id,
          title: `Locked Title ${filter._id.slice(-1)}`,
          author: `Locked Author ${filter._id.slice(-1)}`,
          genre: `Locked Genre ${filter._id.slice(-1)}`,
          stock: 3,
        }),
      };
    }
    assert.equal(opts.runValidators, true);
    return {
      lean: async () => ({
        _id: filter._id,
        title: 'Updated',
        author: 'Author',
        genre: 'Fiction',
        stock: 5,
      }),
    };
  }) as unknown as typeof BookModel.findOneAndUpdate);
  t.mock.method(LendingModel, 'create', (async (
    docs: Array<{ items: typeof createdItems }>,
    opts: { session: unknown }
  ) => {
    assert.equal(opts.session, session);
    createdItems = docs[0].items;
    return [
      {
        toObject: () => ({
          _id: '650000000000000000000099',
          referenceCode: 'MCL-TEST',
          borrowerName: 'Rina Kusuma',
          borrowerPhone: '+62 812-3456-7890',
          dueDate: '2026-12-20',
          lentAt: new Date(),
          returnedAt: null,
          status: 'Active',
          items: docs[0].items,
          totalCopies: 2,
        }),
      },
    ];
  }) as unknown as typeof LendingModel.create);

  const created = await repository.createLendingWithStockDeduction({
    referenceCode: 'MCL-TEST',
    borrowerName: 'Rina Kusuma',
    borrowerPhone: '+62 812-3456-7890',
    dueDate: '2026-12-20',
    items: [
      { bookId: idB, bookTitle: 'Stale B', author: 'Old B', genre: 'Old', quantity: 1 },
      { bookId: idA, bookTitle: 'Stale A', author: 'Old A', genre: 'Old', quantity: 1 },
    ],
    totalCopies: 2,
  });
  assert.deepEqual(deductedIds, [idA, idB]);
  assert.equal(created.items[0].bookTitle, 'Locked Title 1');
  assert.equal(created.items[1].author, 'Locked Author 2');
  assert.equal(createdItems[0].genre, 'Locked Genre 1');

  // 3. updateBook passes runValidators: true
  const updated = await repository.updateBook(idA, {
    title: 'Updated',
    author: 'Author',
    genre: 'Fiction',
  });
  assert.equal(updated?.title, 'Updated');

  // 4. markLendingReturned caps stock increment at 10000 via pipeline
  const capturedUpdates: Array<{ update: unknown; opts: Record<string, unknown> }> = [];
  t.mock.method(LendingModel, 'findOneAndUpdate', (() => ({
    lean: async () => ({
      _id: '650000000000000000000099',
      referenceCode: 'MCL-TEST',
      borrowerName: 'Rina Kusuma',
      borrowerPhone: '+62 812-3456-7890',
      dueDate: '2026-12-20',
      lentAt: new Date(),
      returnedAt: new Date(),
      status: 'Returned',
      items: [
        { bookId: idA, bookTitle: 'A', author: 'A', genre: 'Fiction', quantity: 3 },
      ],
      totalCopies: 3,
    }),
  })) as unknown as typeof LendingModel.findOneAndUpdate);
  t.mock.method(BookModel, 'findByIdAndUpdate', (async (
    _id: unknown,
    update: unknown,
    opts: Record<string, unknown>
  ) => {
    capturedUpdates.push({ update, opts });
    return null;
  }) as unknown as typeof BookModel.findByIdAndUpdate);
  await repository.markLendingReturned('650000000000000000000099');
  assert.equal(capturedUpdates.length, 1);
  assert.deepEqual(capturedUpdates[0].update, [
    { $set: { stock: { $min: [10000, { $add: ['$stock', 3] }] } } },
  ]);
  assert.equal(capturedUpdates[0].opts.updatePipeline, true);

  // 5. MongoDB code 20 (transactions unsupported on standalone) maps to AppError(503)
  t.mock.method(BookModel, 'findByIdAndDelete', (() => {
    const err = Object.assign(
      new Error('Transaction numbers are only allowed on a replica set member'),
      {
        code: 20,
      }
    );
    throw err;
  }) as unknown as typeof BookModel.findByIdAndDelete);
  await assert.rejects(
    () => repository.deleteBook(idA),
    (err: unknown) =>
      err instanceof AppError &&
      err.statusCode === 503 &&
      err.message === 'Database transactions require a MongoDB replica set.'
  );
});

test('createMongoDatabaseManager enforces 5s failure cooldown and guards transitional readyStates', async (t) => {
  const prevUri = process.env.MONGODB_URI;
  process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/test_db';
  let fakeNow = 1_000_000;
  let connectCalls = 0;
  t.mock.method(Date, 'now', () => fakeNow);
  t.mock.method(mongoose, 'connect', (async () => {
    connectCalls++;
    throw new Error('ECONNREFUSED');
  }) as unknown as typeof mongoose.connect);

  const origReadyStateDesc = Object.getOwnPropertyDescriptor(
    mongoose.connection,
    'readyState'
  );
  let mockReadyState = 0;
  Object.defineProperty(mongoose.connection, 'readyState', {
    configurable: true,
    get: () => mockReadyState,
  });

  try {
    const manager = createMongoDatabaseManager();

    // Transitional readyState 2 (connecting) / 3 (disconnecting) must not trigger connect()
    mockReadyState = 2;
    await manager.ensureConnected();
    mockReadyState = 3;
    await manager.ensureConnected();
    assert.equal(connectCalls, 0);

    // Failed connect sets 5s cooldown preventing reconnect storms
    mockReadyState = 0;
    const first = await manager.ensureConnected();
    assert.equal(first.connected, false);
    assert.equal(connectCalls, 1);

    fakeNow += 2_000;
    await manager.ensureConnected();
    assert.equal(connectCalls, 1);

    fakeNow += 3_001;
    await manager.ensureConnected();
    assert.equal(connectCalls, 2);
  } finally {
    if (origReadyStateDesc) {
      Object.defineProperty(mongoose.connection, 'readyState', origReadyStateDesc);
    } else {
      delete (mongoose.connection as unknown as Record<string, unknown>).readyState;
    }
    if (prevUri === undefined) delete process.env.MONGODB_URI;
    else process.env.MONGODB_URI = prevUri;
  }
});
