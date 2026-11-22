import type {
  BookQuery,
  CreateBookInput,
  SortField,
  SortOrder,
  UpdateBookInput,
} from '../../../shared/library';
import { isSafeCoverImageUrl } from '../../../shared/library';
import { AppError } from '../errors';
import { asInteger, asTrimmedString } from '../utils/validation/primitives';

export function requireBookId(rawId: unknown): string {
  const id = asTrimmedString(rawId);
  if (!id) {
    throw new AppError(400, 'Book ID is required.');
  }
  return id;
}

export function validateBookQuery(rawQuery: Record<string, unknown>): BookQuery {
  const genre = asTrimmedString(rawQuery.genre);
  const search = asTrimmedString(rawQuery.search).slice(0, 200);
  const rawSortBy = asTrimmedString(rawQuery.sortBy);
  const rawSortOrder = asTrimmedString(rawQuery.sortOrder);

  const sortBy: SortField = rawSortBy === 'stock' ? 'stock' : 'title';
  const sortOrder: SortOrder = rawSortOrder === 'desc' ? 'desc' : 'asc';

  return {
    genre: genre || undefined,
    search: search || undefined,
    sortBy,
    sortOrder,
  };
}

export function validateBookPayload(rawBody: unknown): CreateBookInput {
  if (!rawBody || typeof rawBody !== 'object' || Array.isArray(rawBody)) {
    throw new AppError(400, 'Invalid book payload.');
  }

  const body = rawBody as Record<string, unknown>;
  const fieldErrors: Record<string, string> = {};

  const title = asTrimmedString(body.title);
  const author = asTrimmedString(body.author);
  const genre = asTrimmedString(body.genre);
  const stock = asInteger(body.stock);
  const isbn = asTrimmedString(body.isbn);
  const coverImage = asTrimmedString(body.coverImage);
  const description = asTrimmedString(body.description);
  const publisher = asTrimmedString(body.publisher);
  const shelfLocation = asTrimmedString(body.shelfLocation);
  const language = asTrimmedString(body.language);
  const publishedYearRaw = body.publishedYear;
  const pagesRaw = body.pages;

  if (title.length < 1 || title.length > 180) {
    fieldErrors.title = 'Title is required (1–180 characters).';
  }
  if (author.length < 1 || author.length > 120) {
    fieldErrors.author = 'Author is required (1–120 characters).';
  }
  if (genre.length < 1 || genre.length > 60) {
    fieldErrors.genre = 'Genre is required (1–60 characters).';
  }
  if (stock === null || stock < 0 || stock > 10000) {
    fieldErrors.stock = 'Stock must be a whole number between 0 and 10,000.';
  }

  let publishedYear: number | undefined;
  if (
    publishedYearRaw !== undefined &&
    publishedYearRaw !== null &&
    publishedYearRaw !== ''
  ) {
    const year = asInteger(publishedYearRaw);
    const maxYear = new Date().getFullYear() + 1;
    if (year === null || year < 1000 || year > maxYear) {
      fieldErrors.publishedYear = `Published year must be between 1000 and ${maxYear}.`;
    } else {
      publishedYear = year;
    }
  }

  let pages: number | undefined;
  if (pagesRaw !== undefined && pagesRaw !== null && pagesRaw !== '') {
    const parsedPages = asInteger(pagesRaw);
    if (parsedPages === null || parsedPages < 1 || parsedPages > 20000) {
      fieldErrors.pages = 'Page count must be a whole number between 1 and 20,000.';
    } else {
      pages = parsedPages;
    }
  }

  if (isbn.length > 40) {
    fieldErrors.isbn = 'ISBN must be 40 characters or fewer.';
  }
  if (publisher.length > 120) {
    fieldErrors.publisher = 'Publisher must be 120 characters or fewer.';
  }
  if (shelfLocation.length > 60) {
    fieldErrors.shelfLocation = 'Shelf location must be 60 characters or fewer.';
  }
  if (language.length > 40) {
    fieldErrors.language = 'Language must be 40 characters or fewer.';
  }
  if (description.length > 1200) {
    fieldErrors.description = 'Synopsis must be 1,200 characters or fewer.';
  }
  if (coverImage.length > 0 && !isSafeCoverImageUrl(coverImage)) {
    fieldErrors.coverImage =
      'Cover image must be a valid http(s) URL or a JPG, PNG, or WebP photo.';
  }

  if (Object.keys(fieldErrors).length > 0) {
    throw new AppError(400, 'Please correct the highlighted book fields.', fieldErrors);
  }

  return {
    title,
    author,
    genre,
    stock: stock!,
    publishedYear,
    isbn: isbn || undefined,
    coverImage: coverImage || undefined,
    description: description || undefined,
    publisher: publisher || undefined,
    pages,
    shelfLocation: shelfLocation || undefined,
    language: language || undefined,
  };
}

export function validateBookUpdatePayload(rawBody: unknown): UpdateBookInput {
  if (!rawBody || typeof rawBody !== 'object' || Array.isArray(rawBody)) {
    throw new AppError(400, 'Invalid book payload.');
  }

  const body = rawBody as Record<string, unknown>;
  const hasStock = Object.prototype.hasOwnProperty.call(body, 'stock');
  const expectedStock = hasStock ? asInteger(body.expectedStock) : null;
  if (
    hasStock &&
    (expectedStock === null || !Number.isSafeInteger(expectedStock) || expectedStock < 0)
  ) {
    throw new AppError(
      400,
      'Current stock is required when changing stock. Refresh the book and try again.'
    );
  }

  const { stock, ...metadata } = validateBookPayload({
    ...body,
    stock: hasStock ? body.stock : 0,
  });

  return {
    ...metadata,
    ...(hasStock ? { stock, expectedStock: expectedStock! } : {}),
  };
}
