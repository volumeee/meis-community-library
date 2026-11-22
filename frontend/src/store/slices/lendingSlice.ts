import type { LendingItemInput } from '@shared/library';
import { libraryApi } from '../../services/api';
import { addDaysToIso } from '../../utils/calendarLogic';
import { MAX_LENDING_QUANTITY } from '../../utils/libraryLogic';
import { useToastStore } from '../useToastStore';
import {
  adjustStock,
  createInitialDraft,
  draftsEqual,
  getAuthErrorsT,
  getLendingT,
  getToastT,
  libraryCounters,
  type LendingDraft,
  type LendingSlice,
  type LibrarySliceCreator,
} from './shared';

export const createLendingSlice: LibrarySliceCreator<LendingSlice> = (set, get) => ({
  lendingDraft: createInitialDraft(),
  dueDateTouched: false,
  lendingPreview: null,
  lendingSnapshot: null,

  addBookToDraft: (bookId) => {
    if (get().isSubmitting) return;
    const book = get().books.find((b) => b.id === bookId);
    if (!book || book.stock < 1) return;

    const draft = get().lendingDraft;
    const existing = draft.items.find((item) => item.bookId === bookId);
    let nextItems: LendingItemInput[];

    if (existing) {
      const nextQty = Math.min(book.stock, MAX_LENDING_QUANTITY, existing.quantity + 1);
      nextItems = draft.items.map((item) =>
        item.bookId === bookId ? { ...item, quantity: nextQty } : item
      );
    } else {
      nextItems = [...draft.items, { bookId, quantity: 1 }];
    }

    libraryCounters.previewVersion += 1;
    set({
      lendingDraft: { ...draft, items: nextItems },
      lendingPreview: null,
      lendingSnapshot: null,
    });
  },

  updateDraftItemQuantity: (bookId, quantity) => {
    if (get().isSubmitting) return;
    const book = get().books.find((b) => b.id === bookId);
    const draft = get().lendingDraft;
    libraryCounters.previewVersion += 1;
    if (!book || book.stock < 1) {
      set({
        lendingDraft: {
          ...draft,
          items: draft.items.filter((item) => item.bookId !== bookId),
        },
        lendingPreview: null,
        lendingSnapshot: null,
      });
      return;
    }
    const clamped = Math.max(
      1,
      Math.min(book.stock, MAX_LENDING_QUANTITY, Math.floor(quantity) || 1)
    );
    set({
      lendingDraft: {
        ...draft,
        items: draft.items.map((item) =>
          item.bookId === bookId ? { ...item, quantity: clamped } : item
        ),
      },
      lendingPreview: null,
      lendingSnapshot: null,
    });
  },

  removeDraftItem: (bookId) => {
    if (get().isSubmitting) return;
    const draft = get().lendingDraft;
    libraryCounters.previewVersion += 1;
    set({
      lendingDraft: {
        ...draft,
        items: draft.items.filter((item) => item.bookId !== bookId),
      },
      lendingPreview: null,
      lendingSnapshot: null,
    });
  },

  setDraftField: (field, value) => {
    if (get().isSubmitting) return;
    const draft = get().lendingDraft;
    libraryCounters.previewVersion += 1;
    set({
      lendingDraft: { ...draft, [field]: value },
      ...(field === 'dueDate' ? { dueDateTouched: true } : {}),
      lendingPreview: null,
      lendingSnapshot: null,
    });
  },

  syncDraftDueDate: (todayIso) => {
    if (get().isSubmitting) return;
    const { dueDateTouched, lendingDraft } = get();
    if (!dueDateTouched || lendingDraft.dueDate < todayIso) {
      const nextDueDate = addDaysToIso(todayIso, 14);
      if (lendingDraft.dueDate === nextDueDate) return;
      libraryCounters.previewVersion += 1;
      set({
        lendingDraft: { ...lendingDraft, dueDate: nextDueDate },
        lendingPreview: null,
        lendingSnapshot: null,
      });
    }
  },

  resetDraft: () => {
    if (get().isSubmitting) return;
    libraryCounters.previewVersion += 1;
    set({
      lendingDraft: createInitialDraft(),
      dueDateTouched: false,
      lendingPreview: null,
      lendingSnapshot: null,
    });
  },

  requestLendingPreview: async () => {
    if (get().isSubmitting) throw new Error(getAuthErrorsT().genericRequestFailed);
    const session = libraryCounters.sessionVersion;
    const previewReq = ++libraryCounters.previewVersion;
    const currentDraft = get().lendingDraft;
    const snapshot: LendingDraft = {
      borrowerName: currentDraft.borrowerName,
      borrowerPhone: currentDraft.borrowerPhone,
      dueDate: currentDraft.dueDate,
      items: currentDraft.items.map((item) => ({ ...item })),
    };
    libraryCounters.activeMutations += 1;
    set({ isSubmitting: true });
    try {
      const preview = await libraryApi.previewLending(snapshot);
      if (session !== libraryCounters.sessionVersion) {
        throw new Error(getAuthErrorsT().sessionChanged);
      }
      if (previewReq !== libraryCounters.previewVersion || get().activeView !== 'lend') {
        libraryCounters.activeMutations = Math.max(
          0,
          libraryCounters.activeMutations - 1
        );
        set({ isSubmitting: libraryCounters.activeMutations > 0 });
        return preview;
      }
      if (!draftsEqual(get().lendingDraft, snapshot)) {
        throw new Error(getLendingT().draftOutOfSync);
      }
      libraryCounters.activeMutations = Math.max(0, libraryCounters.activeMutations - 1);
      set({
        lendingPreview: preview,
        lendingSnapshot: snapshot,
        isSubmitting: libraryCounters.activeMutations > 0,
      });
      return preview;
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

  clearLendingPreview: () => {
    if (!get().isSubmitting) {
      libraryCounters.previewVersion += 1;
      set({ lendingPreview: null, lendingSnapshot: null });
    }
  },

  confirmLending: async () => {
    if (get().isSubmitting || !get().lendingPreview) {
      throw new Error(getLendingT().draftOutOfSync);
    }
    const existingSnapshot = get().lendingSnapshot;
    if (existingSnapshot && !draftsEqual(get().lendingDraft, existingSnapshot)) {
      throw new Error(getLendingT().draftOutOfSync);
    }
    const session = libraryCounters.sessionVersion;
    libraryCounters.dataVersion += 1;
    const snapshot = existingSnapshot ?? get().lendingDraft;
    libraryCounters.activeMutations += 1;
    set({ isSubmitting: true });
    try {
      const transaction = await libraryApi.confirmLending(snapshot);
      if (session !== libraryCounters.sessionVersion) {
        throw new Error(getAuthErrorsT().sessionChanged);
      }

      const current = get().lendingDraft;
      const isUnchanged = draftsEqual(current, snapshot);

      libraryCounters.previewVersion += 1;
      libraryCounters.activeMutations = Math.max(0, libraryCounters.activeMutations - 1);
      set({
        books: adjustStock(get().books, transaction, -1),
        lendings: [
          transaction,
          ...get().lendings.filter((item) => item.id !== transaction.id),
        ],
        lendingDraft: isUnchanged ? createInitialDraft() : current,
        ...(isUnchanged ? { dueDateTouched: false } : {}),
        lendingPreview: null,
        lendingSnapshot: null,
        isSubmitting: libraryCounters.activeMutations > 0,
        activeView: 'history',
        historyStatusFilter: 'All',
      });
      useToastStore
        .getState()
        .pushToast(
          'success',
          getToastT().checkoutConfirmed(
            transaction.totalCopies,
            transaction.borrowerName,
            transaction.referenceCode
          )
        );
      void get().refreshCatalog();
      return transaction;
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
