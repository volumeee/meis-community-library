import { create } from 'zustand';
import { libraryApi } from '../services/api';
import { ALL_GENRES_FILTER } from '../utils/libraryLogic';
import { createCatalogSlice } from './slices/catalogSlice';
import { createHistorySlice } from './slices/historySlice';
import { createLendingSlice } from './slices/lendingSlice';
import {
  createInitialDraft,
  getToastT,
  libraryCounters,
  reconcileCatalogState,
  type HistoryStatusFilter,
  type LendingDraft,
  type LibraryState,
  type WorkspaceView,
} from './slices/shared';
import { useLocaleStore } from './useLocaleStore';
import { useToastStore } from './useToastStore';

export type { HistoryStatusFilter, LendingDraft, WorkspaceView };
export type { ToastMessage } from './useToastStore';

export const useLibraryStore = create<LibraryState>((set, get, api) => ({
  ...createCatalogSlice(set, get, api),
  ...createLendingSlice(set, get, api),
  ...createHistorySlice(set, get, api),

  activeView: 'catalog',
  isLoading: true,
  isSubmitting: false,

  setActiveView: (view) => {
    if (view !== 'lend') libraryCounters.previewVersion += 1;
    set({ activeView: view });
  },

  clearSessionData: () => {
    libraryCounters.sessionVersion += 1;
    libraryCounters.dataVersion += 1;
    libraryCounters.previewVersion += 1;
    libraryCounters.activeMutations = 0;
    useToastStore.getState().clearToasts();
    set({
      books: [],
      genres: [],
      lendings: [],
      activeView: 'catalog',
      selectedGenre: ALL_GENRES_FILTER,
      stockFilter: 'all',
      sortBy: 'title',
      sortOrder: 'asc',
      searchQuery: '',
      historyStatusFilter: 'All',
      isLoading: true,
      isSubmitting: false,
      lendingDraft: createInitialDraft(),
      dueDateTouched: false,
      lendingPreview: null,
      lendingSnapshot: null,
    });
  },

  initialize: async () => {
    const session = libraryCounters.sessionVersion;
    const request = ++libraryCounters.dataVersion;
    set({ isLoading: true });
    try {
      const [books, genres, lendings] = await Promise.all([
        libraryApi.listBooks({ sortBy: get().sortBy, sortOrder: get().sortOrder }),
        libraryApi.listGenres(),
        libraryApi.listLendings(),
      ]);
      if (
        session !== libraryCounters.sessionVersion ||
        request !== libraryCounters.dataVersion
      ) {
        return;
      }
      set({ books, genres, lendings, isLoading: false });
    } catch (error) {
      if (
        session !== libraryCounters.sessionVersion ||
        request !== libraryCounters.dataVersion
      ) {
        return;
      }
      const message =
        error instanceof Error ? error.message : getToastT().loadCatalogError;
      set({ isLoading: false });
      useToastStore.getState().pushToast('error', message);
    }
  },

  refreshCatalog: async () => {
    const session = libraryCounters.sessionVersion;
    const request = ++libraryCounters.dataVersion;
    try {
      const [books, genres, lendings] = await Promise.all([
        libraryApi.listBooks({ sortBy: get().sortBy, sortOrder: get().sortOrder }),
        libraryApi.listGenres(),
        libraryApi.listLendings(),
      ]);
      if (
        session !== libraryCounters.sessionVersion ||
        request !== libraryCounters.dataVersion
      ) {
        return;
      }
      const reconciled = reconcileCatalogState(books, genres, get());
      if (reconciled.previewCleared) libraryCounters.previewVersion += 1;
      set({
        books,
        genres,
        lendings,
        isLoading: false,
        lendingDraft: reconciled.lendingDraft,
        lendingPreview: reconciled.lendingPreview,
        lendingSnapshot: reconciled.lendingSnapshot,
        selectedGenre: reconciled.selectedGenre,
      });
    } catch {
      if (
        session !== libraryCounters.sessionVersion ||
        request !== libraryCounters.dataVersion
      ) {
        return;
      }
      set({ isLoading: false });
      const retry =
        useLocaleStore.getState().locale === 'id'
          ? 'Muat ulang halaman untuk melihat data terbaru.'
          : 'Reload the page to see the latest data.';
      useToastStore.getState().pushToast('error', `${getToastT().refreshError} ${retry}`);
    }
  },
}));
