import { useEffect, useMemo, useState } from 'react';
import { BookOpen, LogOut, Plus } from 'lucide-react';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { AddBookModal } from './features/catalog/AddBookModal';
import { AuthScreen } from './features/auth/AuthScreen';
import { BookDetailModal } from './features/catalog/BookDetailModal';
import { CatalogView } from './features/catalog/CatalogView';
import { ChangePasswordModal } from './features/auth/ChangePasswordModal';
import { ConfirmDeleteModal } from './features/catalog/ConfirmDeleteModal';
import { HistoryView } from './features/history/HistoryView';
import { LanguageToggle } from './components/layout/LanguageToggle';
import { LendingSummaryModal } from './features/lending/LendingSummaryModal';
import { LendingView } from './features/lending/LendingView';
import { MobileBottomNav } from './components/layout/MobileBottomNav';
import { Sidebar } from './components/layout/Sidebar';
import { ThemeToggle } from './components/layout/ThemeToggle';
import { ToastRegion } from './components/layout/ToastRegion';
import { useTheme } from './hooks/useTheme';
import { ApiClientError } from './services/api';
import { useShallow } from 'zustand/react/shallow';
import { useAuthStore } from './store/useAuthStore';
import { useLibraryStore, type WorkspaceView } from './store/useLibraryStore';
import { useI18n } from './store/useLocaleStore';
import { useToastStore } from './store/useToastStore';
import type { Book } from '@shared/library';
import { computeCatalogStats } from './utils/libraryLogic';
import { useLocalTodayIso } from './hooks/useLocalTodayIso';
export default function App() {
  const { theme, toggleTheme } = useTheme();
  const { t } = useI18n();
  const today = useLocalTodayIso();
  const viewLabels: Record<WorkspaceView, string> = {
    catalog: t.nav.catalog,
    lend: t.nav.lend,
    history: t.nav.history,
  };
  const {
    books,
    genres,
    lendings,
    activeView,
    historyStatusFilter,
    isLoading,
    isSubmitting,
    lendingDraft,
    lendingPreview,
    initialize,
    refreshCatalog,
    setActiveView,
    setHistoryStatusFilter,
    addBook,
    updateBook,
    removeBook,
    addBookToDraft,
    updateDraftItemQuantity,
    removeDraftItem,
    setDraftField,
    syncDraftDueDate,
    resetDraft,
    requestLendingPreview,
    clearLendingPreview,
    confirmLending,
    returnLending,
  } = useLibraryStore(
    useShallow((s) => ({
      books: s.books,
      genres: s.genres,
      lendings: s.lendings,
      activeView: s.activeView,
      historyStatusFilter: s.historyStatusFilter,
      isLoading: s.isLoading,
      isSubmitting: s.isSubmitting,
      lendingDraft: s.lendingDraft,
      lendingPreview: s.lendingPreview,
      initialize: s.initialize,
      refreshCatalog: s.refreshCatalog,
      setActiveView: s.setActiveView,
      setHistoryStatusFilter: s.setHistoryStatusFilter,
      addBook: s.addBook,
      updateBook: s.updateBook,
      removeBook: s.removeBook,
      addBookToDraft: s.addBookToDraft,
      updateDraftItemQuantity: s.updateDraftItemQuantity,
      removeDraftItem: s.removeDraftItem,
      setDraftField: s.setDraftField,
      syncDraftDueDate: s.syncDraftDueDate,
      resetDraft: s.resetDraft,
      requestLendingPreview: s.requestLendingPreview,
      clearLendingPreview: s.clearLendingPreview,
      confirmLending: s.confirmLending,
      returnLending: s.returnLending,
    }))
  );
  const pushToast = useToastStore((s) => s.pushToast);

  const {
    phase: authPhase,
    user: authUser,
    bootstrap: bootstrapAuth,
    logout,
    changePassword,
  } = useAuthStore(
    useShallow((s) => ({
      phase: s.phase,
      user: s.user,
      bootstrap: s.bootstrap,
      logout: s.logout,
      changePassword: s.changePassword,
    }))
  );
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [editingBookId, setEditingBookId] = useState<string | null>(null);
  const [pendingDeleteBookId, setPendingDeleteBookId] = useState<string | null>(null);
  const [accountModalOpen, setAccountModalOpen] = useState(false);

  useEffect(() => {
    void bootstrapAuth();
  }, [bootstrapAuth]);

  useEffect(() => {
    syncDraftDueDate(today);
  }, [today, syncDraftDueDate]);

  useEffect(() => {
    if (authPhase === 'authenticated') {
      void initialize();
    } else {
      setAddModalOpen(false);
      setSelectedBookId(null);
      setEditingBookId(null);
      setPendingDeleteBookId(null);
      setAccountModalOpen(false);
    }
  }, [authPhase, initialize]);

  const selectedBook = useMemo(
    () => (selectedBookId ? (books.find((b) => b.id === selectedBookId) ?? null) : null),
    [books, selectedBookId]
  );

  const bookBeingEdited = useMemo(
    () => (editingBookId ? (books.find((b) => b.id === editingBookId) ?? null) : null),
    [books, editingBookId]
  );

  const bookPendingDelete = useMemo(
    () =>
      pendingDeleteBookId
        ? (books.find((b) => b.id === pendingDeleteBookId) ?? null)
        : null,
    [books, pendingDeleteBookId]
  );

  const stats = useMemo(() => computeCatalogStats(books, lendings), [books, lendings]);

  const handleQuickLend = (book: Book) => {
    if (isSubmitting || book.stock <= 0) return;
    setSelectedBookId(null);
    addBookToDraft(book.id);
    setActiveView('lend');
  };

  const handleConfirmDelete = async () => {
    const target = bookPendingDelete;
    if (!target) return;
    await removeBook(target.id, target.title);
    setPendingDeleteBookId((prev) => (prev === target.id ? null : prev));
    setSelectedBookId((prev) => (prev === target.id ? null : prev));
  };

  const handleSignOut = async () => {
    setAddModalOpen(false);
    setSelectedBookId(null);
    setEditingBookId(null);
    setPendingDeleteBookId(null);
    setAccountModalOpen(false);
    await logout();
  };

  const librarianName = authUser?.name ?? 'Mei Lin';

  if (authPhase !== 'authenticated') {
    return (
      <MotionConfig reducedMotion="user">
        <AuthScreen theme={theme} onToggleTheme={toggleTheme} />
      </MotionConfig>
    );
  }

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen flex bg-slate-50 dark:bg-[#0b1120] text-slate-900 dark:text-slate-100">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:rounded-md focus:bg-accent focus:text-white focus:text-sm focus:font-medium focus:shadow-lg"
        >
          {t.meta.skipToContent}
        </a>

        <Sidebar
          activeView={activeView}
          onSelectView={setActiveView}
          totalBooks={books.length}
          draftItemCount={lendingDraft.items.length}
          activeLoansCount={stats.activeLoansCount}
          theme={theme}
          onToggleTheme={toggleTheme}
          librarianName={librarianName}
          onOpenAccount={() => setAccountModalOpen(true)}
          onSignOut={() => void handleSignOut()}
        />
        <div className="flex-1 min-w-0 flex flex-col">
          {/* Top header: CSS Grid aligned with main content container across all breakpoints */}
          <header className="sticky top-0 z-20 h-14 lg:h-16 bg-white/95 dark:bg-surface-dark/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
            <div className="app-header-inner">
              <nav
                aria-label={t.nav.breadcrumb}
                className="min-w-0 flex items-center gap-2 text-sm leading-none"
              >
                <div className="lg:hidden flex h-7 w-7 items-center justify-center rounded-md bg-accent dark:bg-blue-600 text-white shrink-0">
                  <BookOpen className="h-4 w-4" aria-hidden="true" />
                </div>
                <span className="font-display font-bold tracking-tight text-slate-900 dark:text-slate-50 lg:hidden truncate">
                  {t.meta.brandShort}
                </span>
                <span
                  className="hidden sm:inline lg:hidden text-slate-300 dark:text-slate-700 select-none shrink-0"
                  aria-hidden="true"
                >
                  /
                </span>
                <span className="hidden lg:inline text-slate-500 dark:text-slate-400 whitespace-nowrap shrink-0">
                  {t.meta.brandFull}
                </span>
                <span
                  className="hidden lg:inline text-slate-300 dark:text-slate-700 select-none shrink-0"
                  aria-hidden="true"
                >
                  /
                </span>
                <span className="hidden sm:inline font-medium text-slate-800 dark:text-slate-100 truncate">
                  {viewLabels[activeView]}
                </span>
              </nav>

              <div className="flex items-center justify-end gap-1.5 sm:gap-2 shrink-0">
                <div className="lg:hidden flex items-center gap-1.5">
                  <LanguageToggle variant="compact" layoutGroup="mobile-lang" />
                  <ThemeToggle theme={theme} onToggle={toggleTheme} variant="icon" />
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.92 }}
                    onClick={() => void handleSignOut()}
                    aria-label={t.nav.signOut}
                    title={t.nav.signOut}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent dark:focus-visible:outline-blue-400"
                  >
                    <LogOut className="h-4 w-4" aria-hidden="true" />
                  </motion.button>
                </div>
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setAddModalOpen(true)}
                  aria-label={t.nav.addBook}
                  className="hidden lg:inline-flex items-center justify-center gap-1.5 h-10 px-4 text-sm font-medium text-white bg-accent dark:bg-blue-600 rounded-md hover:bg-accent-hover dark:hover:bg-blue-500 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent dark:focus-visible:outline-blue-400"
                >
                  <Plus className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>{t.nav.addBook}</span>
                </motion.button>
              </div>
            </div>
          </header>

          <main
            id="main-content"
            tabIndex={-1}
            className="flex-1 w-full max-w-[1160px] mx-auto px-4 sm:px-8 pt-6 pb-28 lg:py-8 outline-none"
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={activeView}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
              >
                {activeView === 'catalog' && (
                  <CatalogView
                    onOpenAddBook={() => setAddModalOpen(true)}
                    onSelectBook={(book) => setSelectedBookId(book.id)}
                    onEditBook={(book) => setEditingBookId(book.id)}
                    onLendBook={handleQuickLend}
                  />
                )}

                {activeView === 'lend' && (
                  <LendingView
                    books={books}
                    genres={genres}
                    draft={lendingDraft}
                    isLoading={isLoading}
                    isSubmitting={isSubmitting}
                    onAddBook={addBookToDraft}
                    onUpdateQuantity={updateDraftItemQuantity}
                    onRemoveItem={removeDraftItem}
                    onChangeField={setDraftField}
                    onResetDraft={resetDraft}
                    onRequestPreview={async () => {
                      await requestLendingPreview();
                    }}
                  />
                )}

                {activeView === 'history' && (
                  <HistoryView
                    lendings={lendings}
                    statusFilter={historyStatusFilter}
                    onStatusFilterChange={setHistoryStatusFilter}
                    isLoading={isLoading}
                    isSubmitting={isSubmitting}
                    onReturnLending={returnLending}
                    onGoToLend={() => setActiveView('lend')}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>

        <MobileBottomNav
          activeView={activeView}
          onSelectView={setActiveView}
          draftItemCount={lendingDraft.items.length}
          activeLoansCount={stats.activeLoansCount}
          librarianName={librarianName}
          onOpenAddBook={() => setAddModalOpen(true)}
          onOpenAccount={() => setAccountModalOpen(true)}
        />

        <ToastRegion />

        <AnimatePresence>
          {selectedBook && !bookBeingEdited && !bookPendingDelete && (
            <BookDetailModal
              book={selectedBook}
              lendings={lendings}
              onClose={() => setSelectedBookId(null)}
              onEdit={(book) => setEditingBookId(book.id)}
              onLend={handleQuickLend}
              onRequestDelete={(book) => setPendingDeleteBookId(book.id)}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {(addModalOpen || bookBeingEdited) && (
            <AddBookModal
              key={bookBeingEdited ? `edit-${bookBeingEdited.id}` : 'add-new'}
              bookToEdit={bookBeingEdited}
              existingGenres={genres}
              isSubmitting={isSubmitting}
              onClose={() => {
                setAddModalOpen(false);
                setEditingBookId(null);
              }}
              onSubmit={async (input) => {
                if (bookBeingEdited) {
                  const { stock, ...metadata } = input;
                  const stockChanged = stock !== bookBeingEdited.stock;
                  try {
                    await updateBook(
                      bookBeingEdited.id,
                      stockChanged
                        ? { ...metadata, stock, expectedStock: bookBeingEdited.stock }
                        : metadata
                    );
                  } catch (error) {
                    if (error instanceof ApiClientError && error.status === 409) {
                      void refreshCatalog();
                    }
                    throw error;
                  }
                } else {
                  await addBook(input);
                }
              }}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {bookPendingDelete && (
            <ConfirmDeleteModal
              book={bookPendingDelete}
              isSubmitting={isSubmitting}
              onCancel={() => setPendingDeleteBookId(null)}
              onConfirm={handleConfirmDelete}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {lendingPreview && (
            <LendingSummaryModal
              preview={lendingPreview}
              isSubmitting={isSubmitting}
              onEdit={clearLendingPreview}
              onConfirm={async () => {
                await confirmLending();
              }}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {accountModalOpen && authUser && (
            <ChangePasswordModal
              user={authUser}
              onClose={() => setAccountModalOpen(false)}
              onSubmit={changePassword}
              onSuccess={() => pushToast('success', t.toast.passwordChanged)}
            />
          )}
        </AnimatePresence>
      </div>
    </MotionConfig>
  );
}
