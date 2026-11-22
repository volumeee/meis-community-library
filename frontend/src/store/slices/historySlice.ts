import { libraryApi } from '../../services/api';
import { useToastStore } from '../useToastStore';
import {
  adjustStock,
  getToastT,
  libraryCounters,
  type HistorySlice,
  type LibrarySliceCreator,
} from './shared';

export const createHistorySlice: LibrarySliceCreator<HistorySlice> = (set, get) => ({
  lendings: [],
  historyStatusFilter: 'All',

  setHistoryStatusFilter: (historyStatusFilter) => set({ historyStatusFilter }),
  jumpToActiveLoans: () => set({ activeView: 'history', historyStatusFilter: 'Active' }),

  returnLending: async (id) => {
    const session = libraryCounters.sessionVersion;
    libraryCounters.dataVersion += 1;
    libraryCounters.activeMutations += 1;
    set({ isSubmitting: true });
    try {
      const updated = await libraryApi.returnLending(id);
      if (session !== libraryCounters.sessionVersion) return;
      const lendings = get().lendings;
      const wasActive = lendings.some(
        (item) => item.id === id && item.status === 'Active'
      );
      libraryCounters.activeMutations = Math.max(0, libraryCounters.activeMutations - 1);
      set({
        books: wasActive ? adjustStock(get().books, updated, 1) : get().books,
        lendings: lendings.some((item) => item.id === id)
          ? lendings.map((item) => (item.id === id ? updated : item))
          : [updated, ...lendings],
        isSubmitting: libraryCounters.activeMutations > 0,
      });
      useToastStore
        .getState()
        .pushToast(
          'success',
          getToastT().booksReturned(updated.referenceCode, updated.totalCopies)
        );
      void get().refreshCatalog();
    } catch (error) {
      if (session !== libraryCounters.sessionVersion) return;
      const message = error instanceof Error ? error.message : getToastT().returnError;
      libraryCounters.activeMutations = Math.max(0, libraryCounters.activeMutations - 1);
      set({ isSubmitting: libraryCounters.activeMutations > 0 });
      useToastStore.getState().pushToast('error', message);
    }
  },
});
