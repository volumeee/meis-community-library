import { libraryApi } from '../../services/api';
import { ALL_GENRES_FILTER } from '../../utils/libraryLogic';
import { useToastStore } from '../useToastStore';
import {
  genresForBooks,
  getAuthErrorsT,
  getToastT,
  libraryCounters,
  reconcileCatalogState,
  type CatalogSlice,
  type LibrarySliceCreator,
} from './shared';

export const createCatalogSlice: LibrarySliceCreator<CatalogSlice> = (set, get) => ({
  books: [],
  genres: [],
  selectedGenre: ALL_GENRES_FILTER,
  stockFilter: 'all',
  sortBy: 'title',
  sortOrder: 'asc',
  searchQuery: '',

  setSelectedGenre: (genre) => set({ selectedGenre: genre }),
  setStockFilter: (stockFilter) => set({ stockFilter }),
  toggleLowStockFilter: () =>
    set((state) => ({
      stockFilter: state.stockFilter === 'low' ? 'all' : 'low',
    })),
  setSort: (sortBy, sortOrder) => set({ sortBy, sortOrder }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  resetFilters: () =>
    set({
      selectedGenre: ALL_GENRES_FILTER,
      stockFilter: 'all',
      sortBy: 'title',
      sortOrder: 'asc',
      searchQuery: '',
    }),

  addBook: async (input) => {
    const session = libraryCounters.sessionVersion;
    libraryCounters.activeMutations += 1;
    set({ isSubmitting: true });
    try {
      const created = await libraryApi.addBook(input);
      if (session !== libraryCounters.sessionVersion) {
        throw new Error(getAuthErrorsT().sessionChanged);
      }
      const books = [...get().books.filter((b) => b.id !== created.id), created];
      libraryCounters.activeMutations = Math.max(0, libraryCounters.activeMutations - 1);
      set({
        books,
        genres: genresForBooks(books),
        isSubmitting: libraryCounters.activeMutations > 0,
      });
      useToastStore
        .getState()
        .pushToast('success', getToastT().bookAdded(created.title, created.stock));
      void get().refreshCatalog();
      return created;
    } catch (error) {
      if (session === libraryCounters.sessionVersion) {
        libraryCounters.activeMutations = Math.max(
          0,
          libraryCounters.activeMutations - 1
        );
        set({ isSubmitting: libraryCounters.activeMutations > 0 });
      }
      throw error;
    }
  },

  updateBook: async (id, input) => {
    const session = libraryCounters.sessionVersion;
    libraryCounters.activeMutations += 1;
    set({ isSubmitting: true });
    try {
      const updated = await libraryApi.updateBook(id, input);
      if (session !== libraryCounters.sessionVersion) {
        throw new Error(getAuthErrorsT().sessionChanged);
      }
      const books = get().books.map((book) => (book.id === id ? updated : book));
      const genres = genresForBooks(books);
      const reconciled = reconcileCatalogState(books, genres, get());
      if (reconciled.previewCleared) libraryCounters.previewVersion += 1;

      libraryCounters.activeMutations = Math.max(0, libraryCounters.activeMutations - 1);
      set({
        books,
        genres,
        isSubmitting: libraryCounters.activeMutations > 0,
        lendingDraft: reconciled.lendingDraft,
        lendingPreview: reconciled.lendingPreview,
        lendingSnapshot: reconciled.lendingSnapshot,
        selectedGenre: reconciled.selectedGenre,
      });
      useToastStore
        .getState()
        .pushToast('success', getToastT().bookUpdated(updated.title));
      void get().refreshCatalog();
      return updated;
    } catch (error) {
      if (session === libraryCounters.sessionVersion) {
        libraryCounters.activeMutations = Math.max(
          0,
          libraryCounters.activeMutations - 1
        );
        set({ isSubmitting: libraryCounters.activeMutations > 0 });
      }
      throw error;
    }
  },

  removeBook: async (id, title) => {
    const session = libraryCounters.sessionVersion;
    libraryCounters.activeMutations += 1;
    set({ isSubmitting: true });
    try {
      await libraryApi.removeBook(id);
      if (session !== libraryCounters.sessionVersion) {
        throw new Error(getAuthErrorsT().sessionChanged);
      }
      const books = get().books.filter((book) => book.id !== id);
      const genres = genresForBooks(books);
      const reconciled = reconcileCatalogState(books, genres, get());
      if (reconciled.previewCleared) libraryCounters.previewVersion += 1;
      libraryCounters.activeMutations = Math.max(0, libraryCounters.activeMutations - 1);
      set({
        books,
        genres,
        isSubmitting: libraryCounters.activeMutations > 0,
        lendingDraft: reconciled.lendingDraft,
        lendingPreview: reconciled.lendingPreview,
        lendingSnapshot: reconciled.lendingSnapshot,
        selectedGenre: reconciled.selectedGenre,
      });
      useToastStore.getState().pushToast('success', getToastT().bookRemoved(title));
      void get().refreshCatalog();
    } catch (error) {
      if (session === libraryCounters.sessionVersion) {
        libraryCounters.activeMutations = Math.max(
          0,
          libraryCounters.activeMutations - 1
        );
        set({ isSubmitting: libraryCounters.activeMutations > 0 });
      }
      throw error;
    }
  },
});
