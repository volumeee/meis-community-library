import { isSafeCoverImageUrl, MAX_COVER_DATA_URL_LENGTH } from '@shared/library';
import { TRANSLATIONS, type Locale } from '../i18n/translations';
import type {
  Book,
  BookQuery,
  CreateBookInput,
  CreateLendingInput,
  LendingStatus,
  LendingTransaction,
} from '@shared/library';
import { addDaysToIso, getLocalTodayIso, parseIsoDate } from './calendarLogic';

const PHONE_REGEX = /^[+]?[\d\s\-().]{7,25}$/;
export const MAX_LENDING_QUANTITY = 100;
export const ALL_GENRES_FILTER = '';

function isValidPhone(raw: string): boolean {
  const trimmed = raw.trim();
  if (!PHONE_REGEX.test(trimmed)) return false;
  const digits = trimmed.replace(/\D/g, '').length;
  return digits >= 7 && digits <= 15;
}
export interface CatalogStats {
  totalTitles: number;
  totalCopiesInStock: number;
  activeLoansCount: number;
  copiesCurrentlyOut: number;
  lowStockCount: number;
}

export type StockFilter = 'all' | 'low';

export function filterAndSortBooks(
  books: Book[],
  query: BookQuery & { stockFilter?: StockFilter }
): Book[] {
  let list = [...books];

  if (query.stockFilter === 'low') {
    list = list.filter((book) => book.stock <= 2);
  }

  if (query.genre && query.genre !== ALL_GENRES_FILTER) {
    const target = query.genre.toLowerCase();
    list = list.filter((book) => book.genre.toLowerCase() === target);
  }

  if (query.search && query.search.trim().length > 0) {
    const term = query.search.trim().toLowerCase();
    list = list.filter(
      (book) =>
        book.title.toLowerCase().includes(term) ||
        book.author.toLowerCase().includes(term) ||
        book.genre.toLowerCase().includes(term) ||
        (book.isbn && book.isbn.toLowerCase().includes(term))
    );
  }

  const sortBy = query.sortBy === 'stock' ? 'stock' : 'title';
  const direction = query.sortOrder === 'desc' ? -1 : 1;

  list.sort((a, b) => {
    if (sortBy === 'stock') {
      if (a.stock !== b.stock) {
        return (a.stock - b.stock) * direction;
      }
      return a.title.localeCompare(b.title);
    }
    return a.title.localeCompare(b.title) * direction;
  });

  return list;
}

export function computeCatalogStats(
  books: Book[],
  lendings: LendingTransaction[]
): CatalogStats {
  const totalTitles = books.length;
  const totalCopiesInStock = books.reduce((sum, b) => sum + b.stock, 0);
  const lowStockCount = books.filter((b) => b.stock <= 2).length;
  const activeLoans = lendings.filter((l) => l.status === 'Active');
  const activeLoansCount = activeLoans.length;
  const copiesCurrentlyOut = activeLoans.reduce((sum, l) => sum + l.totalCopies, 0);

  return {
    totalTitles,
    totalCopiesInStock,
    activeLoansCount,
    copiesCurrentlyOut,
    lowStockCount,
  };
}

export { isSafeCoverImageUrl, MAX_COVER_DATA_URL_LENGTH };

export function validateBookForm(
  input: Partial<CreateBookInput> & {
    stockInput?: string;
    yearInput?: string;
    pagesInput?: string;
  },
  locale: Locale = 'en'
): Record<string, string> {
  const v = TRANSLATIONS[locale].validation;
  const errors: Record<string, string> = {};
  const title = (input.title ?? '').trim();
  const author = (input.author ?? '').trim();
  const genre = (input.genre ?? '').trim();

  if (title.length === 0) {
    errors.title = v.titleRequired;
  } else if (title.length > 180) {
    errors.title = v.titleTooLong;
  }

  if (author.length === 0) {
    errors.author = v.authorRequired;
  } else if (author.length > 120) {
    errors.author = v.authorTooLong;
  }

  if (genre.length === 0) {
    errors.genre = v.genreRequired;
  } else if (genre.length > 60) {
    errors.genre = v.genreTooLong;
  }

  const stockRaw =
    input.stockInput !== undefined ? input.stockInput.trim() : String(input.stock ?? '');
  const stockNum = Number(stockRaw);
  if (
    stockRaw === '' ||
    !Number.isInteger(stockNum) ||
    stockNum < 0 ||
    stockNum > 10000
  ) {
    errors.stock = v.stockInvalid;
  }

  const yearRaw =
    input.yearInput !== undefined
      ? input.yearInput.trim()
      : input.publishedYear !== undefined
        ? String(input.publishedYear)
        : '';
  if (yearRaw !== '') {
    const yearNum = Number(yearRaw);
    const maxYear = new Date().getFullYear() + 1;
    if (!Number.isInteger(yearNum) || yearNum < 1000 || yearNum > maxYear) {
      errors.publishedYear = v.yearInvalid(maxYear);
    }
  }

  const pagesRaw =
    input.pagesInput !== undefined
      ? input.pagesInput.trim()
      : input.pages !== undefined
        ? String(input.pages)
        : '';
  if (pagesRaw !== '') {
    const pagesNum = Number(pagesRaw);
    if (!Number.isInteger(pagesNum) || pagesNum < 1 || pagesNum > 20000) {
      errors.pages = v.pagesInvalid;
    }
  }

  if (input.isbn && input.isbn.trim().length > 40) {
    errors.isbn = v.isbnTooLong;
  }

  if (input.publisher && input.publisher.trim().length > 120) {
    errors.publisher = v.publisherTooLong;
  }

  if (input.shelfLocation && input.shelfLocation.trim().length > 60) {
    errors.shelfLocation = v.shelfTooLong;
  }

  if (input.language && input.language.trim().length > 40) {
    errors.language = v.languageTooLong;
  }

  if (input.description && input.description.trim().length > 1200) {
    errors.description = v.descriptionTooLong;
  }

  if (input.coverImage && input.coverImage.trim().length > 0) {
    if (!isSafeCoverImageUrl(input.coverImage)) {
      errors.coverImage = v.coverInvalid;
    }
  }

  return errors;
}

export function validateLendingForm(
  input: CreateLendingInput,
  books: Book[],
  locale: Locale = 'en'
): Record<string, string> {
  const v = TRANSLATIONS[locale].validation;
  const errors: Record<string, string> = {};

  const borrowerName = input.borrowerName.trim();
  if (borrowerName.length < 2) {
    errors.borrowerName = v.borrowerNameShort;
  } else if (borrowerName.length > 120) {
    errors.borrowerName = v.borrowerNameTooLong;
  }

  if (!isValidPhone(input.borrowerPhone)) {
    errors.borrowerPhone = v.phoneInvalid;
  }

  const dueDate = input.dueDate.trim();
  if (!parseIsoDate(dueDate)) {
    errors.dueDate = v.dueDateInvalid;
  } else if (dueDate < getLocalTodayIso()) {
    errors.dueDate =
      locale === 'id'
        ? 'Tanggal jatuh tempo tidak boleh sebelum hari ini.'
        : 'The due date cannot be before today.';
  }

  if (input.items.length === 0) {
    errors.items = v.itemsEmpty;
  } else {
    const bookMap = new Map(books.map((b) => [b.id, b]));
    const totalsByBookId = new Map<string, number>();
    for (const item of input.items) {
      const book = bookMap.get(item.bookId);
      if (!book) {
        errors.items = v.itemMissing;
        break;
      }
      if (!Number.isInteger(item.quantity) || item.quantity < 1) {
        errors.items = v.itemQtyMin(book.title);
        break;
      }
      const totalQty = (totalsByBookId.get(item.bookId) ?? 0) + item.quantity;
      totalsByBookId.set(item.bookId, totalQty);
      if (totalQty > MAX_LENDING_QUANTITY) {
        errors.items =
          locale === 'id'
            ? `Jumlah untuk "${book.title}" maksimal 100 eksemplar.`
            : `The maximum quantity for "${book.title}" is 100.`;
        break;
      }
      if (totalQty > book.stock) {
        errors.items = v.itemQtyExceeds(book.stock, book.title);
        break;
      }
    }
  }

  return errors;
}

export function getDefaultDueDate(daysFromToday = 14, now = new Date()): string {
  return addDaysToIso(getLocalTodayIso(now), daysFromToday);
}

export function isLoanOverdue(
  dueDate: string,
  status: LendingStatus,
  todayIso = getLocalTodayIso()
): boolean {
  if (status !== 'Active') return false;
  return dueDate < todayIso;
}

export function formatShortDate(isoValue: string, locale: Locale = 'en'): string {
  if (!isoValue) return '—';
  const isoParts = parseIsoDate(isoValue);
  const parsed = isoParts
    ? new Date(isoParts.year, isoParts.month, isoParts.day)
    : new Date(isoValue);
  if (Number.isNaN(parsed.getTime())) return isoValue;
  return parsed.toLocaleDateString(locale === 'id' ? 'id-ID' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
