import type { StateCreator } from 'zustand';
import type {
  Book,
  CreateBookInput,
  LendingItemInput,
  LendingPreview,
  LendingTransaction,
  SortField,
  SortOrder,
  UpdateBookInput,
} from '@shared/library';
import type { WorkspaceView } from '../../config/navigation';
import { TRANSLATIONS } from '../../i18n/translations';
import {
  ALL_GENRES_FILTER,
  getDefaultDueDate,
  MAX_LENDING_QUANTITY,
  type StockFilter,
} from '../../utils/libraryLogic';
import { useLocaleStore } from '../useLocaleStore';

export type { WorkspaceView };
export type HistoryStatusFilter = 'All' | 'Active' | 'Returned';

export interface LendingDraft {
  borrowerName: string;
  borrowerPhone: string;
  dueDate: string;
  items: LendingItemInput[];
}

export interface CatalogSlice {
  books: Book[];
  genres: string[];
  selectedGenre: string;
  stockFilter: StockFilter;
  sortBy: SortField;
  sortOrder: SortOrder;
  searchQuery: string;

  setSelectedGenre: (genre: string) => void;
  setStockFilter: (filter: StockFilter) => void;
  toggleLowStockFilter: () => void;
  setSort: (sortBy: SortField, sortOrder: SortOrder) => void;
  setSearchQuery: (query: string) => void;
  resetFilters: () => void;

  addBook: (input: CreateBookInput) => Promise<Book>;
  updateBook: (id: string, input: UpdateBookInput) => Promise<Book>;
  removeBook: (id: string, title: string) => Promise<void>;
}

export interface LendingSlice {
  lendingDraft: LendingDraft;
  dueDateTouched: boolean;
  lendingPreview: LendingPreview | null;
  lendingSnapshot: LendingDraft | null;

  addBookToDraft: (bookId: string) => void;
  updateDraftItemQuantity: (bookId: string, quantity: number) => void;
  removeDraftItem: (bookId: string) => void;
  setDraftField: (
    field: 'borrowerName' | 'borrowerPhone' | 'dueDate',
    value: string
  ) => void;
  syncDraftDueDate: (todayIso: string) => void;
  resetDraft: () => void;

  requestLendingPreview: () => Promise<LendingPreview>;
  clearLendingPreview: () => void;
  confirmLending: () => Promise<LendingTransaction>;
}

export interface HistorySlice {
  lendings: LendingTransaction[];
  historyStatusFilter: HistoryStatusFilter;

  setHistoryStatusFilter: (status: HistoryStatusFilter) => void;
  jumpToActiveLoans: () => void;
  returnLending: (id: string) => Promise<void>;
}

export interface LibraryWorkspaceSlice {
  activeView: WorkspaceView;
  isLoading: boolean;
  isSubmitting: boolean;

  initialize: () => Promise<void>;
  refreshCatalog: () => Promise<void>;
  setActiveView: (view: WorkspaceView) => void;
  clearSessionData: () => void;
}

export type LibraryState = CatalogSlice &
  LendingSlice &
  HistorySlice &
  LibraryWorkspaceSlice;

export type LibrarySliceCreator<T> = StateCreator<LibraryState, [], [], T>;

export const libraryCounters = {
  sessionVersion: 0,
  dataVersion: 0,
  previewVersion: 0,
  activeMutations: 0,
};

export function getToastT() {
  return TRANSLATIONS[useLocaleStore.getState().locale].toast;
}

export function getLendingT() {
  return TRANSLATIONS[useLocaleStore.getState().locale].lending;
}

export function getAuthErrorsT() {
  return TRANSLATIONS[useLocaleStore.getState().locale].auth.errors;
}

export function createInitialDraft(): LendingDraft {
  return {
    borrowerName: '',
    borrowerPhone: '',
    dueDate: getDefaultDueDate(14),
    items: [],
  };
}

export function draftsEqual(a: LendingDraft, b: LendingDraft): boolean {
  return (
    a.borrowerName === b.borrowerName &&
    a.borrowerPhone === b.borrowerPhone &&
    a.dueDate === b.dueDate &&
    a.items.length === b.items.length &&
    a.items.every(
      (it, idx) =>
        it.bookId === b.items[idx]?.bookId && it.quantity === b.items[idx]?.quantity
    )
  );
}

export function genresForBooks(books: Book[]): string[] {
  return [
    ...new Set(books.map((book) => book.genre).filter((genre) => genre.trim())),
  ].sort((a, b) => a.localeCompare(b));
}

export function adjustStock(
  books: Book[],
  transaction: LendingTransaction,
  direction: 1 | -1
): Book[] {
  const quantities = new Map(
    transaction.items.map((item) => [item.bookId, item.quantity])
  );
  return books.map((book) => {
    const quantity = quantities.get(book.id);
    return quantity
      ? { ...book, stock: Math.max(0, book.stock + direction * quantity) }
      : book;
  });
}

export function reconcileCatalogState(
  books: Book[],
  genres: string[],
  state: Pick<
    LibraryState,
    'lendingDraft' | 'lendingPreview' | 'lendingSnapshot' | 'selectedGenre'
  >
): {
  lendingDraft: LendingDraft;
  lendingPreview: LendingPreview | null;
  lendingSnapshot: LendingDraft | null;
  selectedGenre: string;
  previewCleared: boolean;
} {
  const bookMap = new Map(books.map((book) => [book.id, book]));

  const reconciledItems = state.lendingDraft.items
    .map((item) => {
      const book = bookMap.get(item.bookId);
      if (!book || book.stock < 1) return null;
      const quantity = Math.min(item.quantity, book.stock, MAX_LENDING_QUANTITY);
      return quantity === item.quantity ? item : { ...item, quantity };
    })
    .filter((item): item is LendingItemInput => item !== null);

  const draftChanged =
    reconciledItems.length !== state.lendingDraft.items.length ||
    reconciledItems.some((item, idx) => item !== state.lendingDraft.items[idx]);

  const lendingDraft = draftChanged
    ? { ...state.lendingDraft, items: reconciledItems }
    : state.lendingDraft;

  let lendingPreview = state.lendingPreview;
  let lendingSnapshot = state.lendingSnapshot;
  let previewCleared = false;

  if (lendingPreview !== null) {
    const invalidPreview = lendingPreview.items.some((item) => {
      const book = bookMap.get(item.bookId);
      return !book || book.stock < item.quantity;
    });
    if (invalidPreview) {
      lendingPreview = null;
      lendingSnapshot = null;
      previewCleared = true;
    } else {
      let previewItemChanged = false;
      const updatedItems = lendingPreview.items.map((item) => {
        const book = bookMap.get(item.bookId)!;
        const remainingStock = book.stock - item.quantity;
        if (
          item.bookTitle === book.title &&
          item.author === book.author &&
          item.genre === book.genre &&
          item.availableStock === book.stock &&
          item.remainingStock === remainingStock
        ) {
          return item;
        }
        previewItemChanged = true;
        return {
          ...item,
          bookTitle: book.title,
          author: book.author,
          genre: book.genre,
          availableStock: book.stock,
          remainingStock,
        };
      });
      if (previewItemChanged) {
        lendingPreview = { ...lendingPreview, items: updatedItems };
      }
    }
  }

  const selectedGenre =
    state.selectedGenre !== ALL_GENRES_FILTER && !genres.includes(state.selectedGenre)
      ? ALL_GENRES_FILTER
      : state.selectedGenre;

  return {
    lendingDraft,
    lendingPreview,
    lendingSnapshot,
    selectedGenre,
    previewCleared,
  };
}
