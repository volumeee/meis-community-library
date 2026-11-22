import type { Book, BookQuery } from '../../../../shared/library';

export function addDaysIsoDate(baseDate: Date, offsetDays: number): string {
  const d = new Date(baseDate);
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

export function daysAgoIsoTimestamp(baseDate: Date, daysAgo: number): string {
  const d = new Date(baseDate);
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString();
}

export function sortAndFilterBooks(books: Book[], query: BookQuery): Book[] {
  let result = [...books];

  if (query.genre && query.genre !== 'All') {
    const targetGenre = query.genre.toLowerCase();
    result = result.filter((b) => b.genre.toLowerCase() === targetGenre);
  }

  if (query.search && query.search.trim().length > 0) {
    const q = query.search.trim().toLowerCase();
    result = result.filter(
      (b) =>
        b.title.toLowerCase().includes(q) ||
        b.author.toLowerCase().includes(q) ||
        b.genre.toLowerCase().includes(q) ||
        (b.isbn && b.isbn.toLowerCase().includes(q))
    );
  }

  const sortBy = query.sortBy === 'stock' ? 'stock' : 'title';
  const direction = query.sortOrder === 'desc' ? -1 : 1;

  result.sort((a, b) => {
    if (sortBy === 'stock') {
      if (a.stock !== b.stock) {
        return (a.stock - b.stock) * direction;
      }
      return a.title.localeCompare(b.title);
    }
    return a.title.localeCompare(b.title) * direction;
  });

  return result;
}

export function isUnsupportedTransactionError(error: unknown): boolean {
  return (
    typeof error === 'object' && error !== null && 'code' in error && error.code === 20
  );
}
