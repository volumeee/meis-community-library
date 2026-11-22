import assert from 'node:assert/strict';
import test from 'node:test';
import { TRANSLATIONS } from '../i18n/translations';
import type { Book, LendingTransaction } from '@shared/library';
import { addDaysToIso, buildCalendarMonthGrid, getLocalTodayIso } from './calendarLogic';
import {
  computeCatalogStats,
  filterAndSortBooks,
  formatShortDate,
  getDefaultDueDate,
  isLoanOverdue,
  isSafeCoverImageUrl,
  validateBookForm,
  validateLendingForm,
} from './libraryLogic';

const SAMPLE_BOOKS: Book[] = [
  {
    id: 'b1',
    title: 'Clean Code',
    author: 'Robert C. Martin',
    genre: 'Technology',
    stock: 4,
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
  },
  {
    id: 'b2',
    title: 'Atomic Habits',
    author: 'James Clear',
    genre: 'Non-Fiction',
    stock: 9,
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
  },
  {
    id: 'b3',
    title: 'The Hobbit',
    author: 'J.R.R. Tolkien',
    genre: 'Fantasy',
    stock: 2,
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
  },
];

const SAMPLE_LENDINGS: LendingTransaction[] = [
  {
    id: 'l1',
    referenceCode: 'MCL-1001',
    borrowerName: 'Nadia Pratama',
    borrowerPhone: '+62 813-4820-1190',
    dueDate: '2026-11-30',
    lentAt: '2026-11-15T00:00:00.000Z',
    returnedAt: null,
    status: 'Active',
    items: [
      {
        bookId: 'b1',
        bookTitle: 'Clean Code',
        author: 'Robert C. Martin',
        genre: 'Technology',
        quantity: 2,
      },
    ],
    totalCopies: 2,
  },
];

test('filterAndSortBooks filters by genre and sorts by title or stock', () => {
  const techOnly = filterAndSortBooks(SAMPLE_BOOKS, { genre: 'Technology' });
  assert.equal(techOnly.length, 1);
  assert.equal(techOnly[0].title, 'Clean Code');

  const byTitleAsc = filterAndSortBooks(SAMPLE_BOOKS, {
    sortBy: 'title',
    sortOrder: 'asc',
  });
  assert.deepEqual(
    byTitleAsc.map((b) => b.title),
    ['Atomic Habits', 'Clean Code', 'The Hobbit']
  );

  const byStockDesc = filterAndSortBooks(SAMPLE_BOOKS, {
    sortBy: 'stock',
    sortOrder: 'desc',
  });
  assert.deepEqual(
    byStockDesc.map((b) => b.stock),
    [9, 4, 2]
  );

  const lowStockOnly = filterAndSortBooks(SAMPLE_BOOKS, {
    stockFilter: 'low',
  });
  assert.equal(lowStockOnly.length, 1);
  assert.equal(lowStockOnly[0].title, 'The Hobbit');
});

test('computeCatalogStats aggregates totals and active loans accurately', () => {
  const stats = computeCatalogStats(SAMPLE_BOOKS, SAMPLE_LENDINGS);
  assert.equal(stats.totalTitles, 3);
  assert.equal(stats.totalCopiesInStock, 15);
  assert.equal(stats.activeLoansCount, 1);
  assert.equal(stats.copiesCurrentlyOut, 2);
  assert.equal(stats.lowStockCount, 1);
});

test('validateBookForm flags missing fields, invalid stock, and numeric publishedYear/pages fallbacks', () => {
  const invalid = validateBookForm({
    title: '',
    author: '',
    genre: '',
    stockInput: '-2',
  });
  assert.ok(invalid.title);
  assert.ok(invalid.author);
  assert.ok(invalid.genre);
  assert.ok(invalid.stock);

  const valid = validateBookForm({
    title: 'Dune',
    author: 'Frank Herbert',
    genre: 'Science',
    stockInput: '6',
    yearInput: '1965',
    pagesInput: '412',
    publisher: 'Chilton Books',
    shelfLocation: 'Aisle C · Shelf 2',
    coverImage: 'https://example.com/dune.jpg',
    description: 'Epic desert planet science fiction novel.',
  });
  assert.equal(Object.keys(valid).length, 0);

  const badExtras = validateBookForm({
    title: 'Dune',
    author: 'Frank Herbert',
    genre: 'Science',
    stockInput: '6',
    pagesInput: '0',
    coverImage: 'javascript:alert(1)',
  });
  assert.ok(badExtras.pages);
  assert.ok(badExtras.coverImage);

  const badNumericFallback = validateBookForm({
    title: 'Dune',
    author: 'Frank Herbert',
    genre: 'Science',
    stock: 3,
    publishedYear: 999,
    pages: 0,
  });
  assert.ok(badNumericFallback.publishedYear);
  assert.ok(badNumericFallback.pages);

  const validNumericFallback = validateBookForm({
    title: 'Dune',
    author: 'Frank Herbert',
    genre: 'Science',
    stock: 3,
    publishedYear: 1965,
    pages: 412,
  });
  assert.equal(Object.keys(validNumericFallback).length, 0);
});

test('isSafeCoverImageUrl accepts safe assets/URLs and blocks unsafe schemes or oversized asset paths', () => {
  assert.equal(isSafeCoverImageUrl('/src/assets/images/cover_cosmos_123.jpg'), true);
  assert.equal(isSafeCoverImageUrl('https://cdn.example.org/cover.webp'), true);
  assert.equal(isSafeCoverImageUrl('data:image/jpeg;base64,/9j/4AAQ=='), true);
  assert.equal(isSafeCoverImageUrl('javascript:alert(1)'), false);
  assert.equal(isSafeCoverImageUrl('data:image/svg+xml;base64,PHN2Zz4='), false);
  assert.equal(isSafeCoverImageUrl('/src/assets/images/../secret.jpg'), false);
  assert.equal(isSafeCoverImageUrl(`/src/assets/images/${'a'.repeat(240)}.jpg`), false);
  assert.equal(isSafeCoverImageUrl(`/src/assets/images/${'a'.repeat(233)}.jpg`), true);
});

test('validateLendingForm enforces stock limits, aggregates duplicate items, and caps borrower name length', () => {
  const overLimit = validateLendingForm(
    {
      borrowerName: 'Mei Guest',
      borrowerPhone: '+62 812-0000-1111',
      dueDate: '2099-12-05',
      items: [{ bookId: 'b3', quantity: 5 }],
    },
    SAMPLE_BOOKS
  );
  assert.ok(overLimit.items);

  const duplicateOverStock = validateLendingForm(
    {
      borrowerName: 'Mei Guest',
      borrowerPhone: '+62 812-0000-1111',
      dueDate: '2099-12-05',
      items: [
        { bookId: 'b3', quantity: 2 },
        { bookId: 'b3', quantity: 1 },
      ],
    },
    SAMPLE_BOOKS
  );
  assert.ok(duplicateOverStock.items);

  const duplicateWithinStock = validateLendingForm(
    {
      borrowerName: 'Mei Guest',
      borrowerPhone: '+62 812-0000-1111',
      dueDate: '2099-12-05',
      items: [
        { bookId: 'b3', quantity: 1 },
        { bookId: 'b3', quantity: 1 },
      ],
    },
    SAMPLE_BOOKS
  );
  assert.equal(duplicateWithinStock.items, undefined);

  const tooLongNameEn = validateLendingForm(
    {
      borrowerName: 'A'.repeat(121),
      borrowerPhone: '+62 812-0000-1111',
      dueDate: '2099-12-05',
      items: [{ bookId: 'b1', quantity: 1 }],
    },
    SAMPLE_BOOKS,
    'en'
  );
  assert.equal(
    tooLongNameEn.borrowerName,
    TRANSLATIONS.en.validation.borrowerNameTooLong
  );

  const tooLongNameId = validateLendingForm(
    {
      borrowerName: 'A'.repeat(121),
      borrowerPhone: '+62 812-0000-1111',
      dueDate: '2099-12-05',
      items: [{ bookId: 'b1', quantity: 1 }],
    },
    SAMPLE_BOOKS,
    'id'
  );
  assert.equal(
    tooLongNameId.borrowerName,
    TRANSLATIONS.id.validation.borrowerNameTooLong
  );
});

test('isLoanOverdue detects past-due active loans only', () => {
  assert.equal(isLoanOverdue('2026-11-10', 'Active', '2026-11-21'), true);
  assert.equal(isLoanOverdue('2026-11-25', 'Active', '2026-11-21'), false);
  assert.equal(isLoanOverdue('2026-11-10', 'Returned', '2026-11-21'), false);
});

test('local dates and overdue status roll over at local midnight', (t) => {
  const previousTimezone = process.env.TZ;
  process.env.TZ = 'Asia/Jakarta';
  t.after(() => {
    if (previousTimezone === undefined) delete process.env.TZ;
    else process.env.TZ = previousTimezone;
  });
  t.mock.timers.enable({ apis: ['Date'], now: new Date('2026-12-31T16:59:59.999Z') });
  assert.equal(getDefaultDueDate(), '2027-01-14');
  assert.equal(isLoanOverdue('2026-12-31', 'Active'), false);
  assert.equal(
    buildCalendarMonthGrid(2026, 11).find((cell) => cell.iso === '2026-12-31')?.isToday,
    true
  );

  t.mock.timers.setTime(new Date('2026-12-31T17:00:00.000Z').getTime());
  assert.equal(getDefaultDueDate(), '2027-01-15');
  assert.equal(isLoanOverdue('2026-12-31', 'Active'), true);
  assert.equal(
    buildCalendarMonthGrid(2027, 0).find((cell) => cell.iso === '2027-01-01')?.isToday,
    true
  );
  assert.equal(addDaysToIso(getLocalTodayIso(), 7), '2027-01-08');

  const input = {
    borrowerName: 'Reader',
    borrowerPhone: '12345678',
    dueDate: '2026-12-31',
    items: [{ bookId: 'b1', quantity: 1 }],
  };
  assert.match(validateLendingForm(input, SAMPLE_BOOKS).dueDate, /before today/);
  assert.equal(
    validateLendingForm({ ...input, dueDate: '2027-01-01' }, SAMPLE_BOOKS).dueDate,
    undefined
  );
  assert.ok(
    validateLendingForm({ ...input, dueDate: '2027-02-30' }, SAMPLE_BOOKS).dueDate
  );
});

test('lending validation caps each title at 100 even with larger stock', () => {
  const book = { ...SAMPLE_BOOKS[0], stock: 150 };
  const input = {
    borrowerName: 'Reader',
    borrowerPhone: '12345678',
    dueDate: '2099-01-01',
    items: [{ bookId: book.id, quantity: 101 }],
  };
  assert.match(validateLendingForm(input, [book]).items, /maximum.*100/i);
  assert.equal(
    validateLendingForm({ ...input, items: [{ bookId: book.id, quantity: 100 }] }, [book])
      .items,
    undefined
  );
});

test('formatShortDate formats ISO dates without off-by-one month shifts', () => {
  assert.equal(formatShortDate('2026-01-15', 'en'), 'Jan 15, 2026');
  assert.equal(formatShortDate('2026-12-31', 'en'), 'Dec 31, 2026');
  assert.equal(formatShortDate('2026-05-03', 'id'), '3 Mei 2026');
  assert.equal(formatShortDate('not-a-date', 'en'), 'not-a-date');
});
