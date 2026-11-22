import assert from 'node:assert/strict';
import test from 'node:test';
import { TRANSLATIONS } from '../i18n/translations';
import { ApiClientError, authApi, getAccessToken, libraryApi } from '../services/api';
import type {
  AuthSessionResponse,
  Book,
  LendingPreview,
  LendingTransaction,
} from '@shared/library';
import { ALL_GENRES_FILTER } from '../utils/libraryLogic';
import { useAuthStore } from './useAuthStore';
import { useLibraryStore } from './useLibraryStore';
import { useLocaleStore } from './useLocaleStore';
import { useToastStore } from './useToastStore';

const session: AuthSessionResponse = {
  accessToken: 'test-token',
  expiresInSeconds: 900,
  user: { id: 'u1', name: 'Mei', email: 'mei@example.test', role: 'admin' },
};

const book: Book = {
  id: 'b1',
  title: 'A Book',
  author: 'Author',
  genre: 'Fiction',
  stock: 150,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const transaction: LendingTransaction = {
  id: 'l1',
  referenceCode: 'MCL-1',
  borrowerName: 'Reader',
  borrowerPhone: '12345678',
  dueDate: '2099-01-01',
  lentAt: '2026-01-01T00:00:00.000Z',
  returnedAt: null,
  status: 'Active',
  items: [
    {
      bookId: book.id,
      bookTitle: book.title,
      author: book.author,
      genre: book.genre,
      quantity: 2,
    },
  ],
  totalCopies: 2,
};

function json(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function settle(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}

test('successful mutations stay successful when catalog refresh fails', async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });
  const mutations: string[] = [];
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const path = String(input);
    const method = init?.method ?? 'GET';
    if (path === '/api/auth/login') return json(session);
    if (method === 'GET') return json({ error: 'Catalog unavailable' }, 503);
    mutations.push(`${method} ${path}`);
    if (method === 'POST' && path === '/api/books') return json({ book });
    if (method === 'PATCH' && path === '/api/books/b1')
      return json({ book: { ...book, title: 'Updated' } });
    if (method === 'DELETE' && path === '/api/books/b1') return json({ deleted: true });
    if (method === 'POST' && path === '/api/lendings') return json({ transaction });
    if (method === 'PATCH' && path === '/api/lendings/l1/return') {
      return json({
        transaction: {
          ...transaction,
          status: 'Returned',
          returnedAt: '2026-01-02T00:00:00.000Z',
        },
      });
    }
    throw new Error(`Unexpected request ${method} ${path}`);
  }) as typeof fetch;

  await authApi.login({ email: session.user.email, password: 'password' });
  useLibraryStore.getState().clearSessionData();
  const store = useLibraryStore;
  const input = {
    title: book.title,
    author: book.author,
    genre: book.genre,
    stock: book.stock,
  };

  assert.equal((await store.getState().addBook(input)).id, book.id);
  await settle();
  assert.equal(store.getState().books[0].id, book.id);
  assert.ok(
    useToastStore.getState().toasts.some((toast) => toast.message.includes('refresh'))
  );

  assert.equal(
    (await store.getState().updateBook(book.id, { ...input, expectedStock: book.stock }))
      .title,
    'Updated'
  );
  await settle();
  assert.equal(store.getState().books[0].title, 'Updated');

  await store.getState().removeBook(book.id, book.title);
  await settle();
  assert.deepEqual(store.getState().books, []);

  const preview: LendingPreview = {
    borrowerName: transaction.borrowerName,
    borrowerPhone: transaction.borrowerPhone,
    dueDate: transaction.dueDate,
    totalTitles: 1,
    totalCopies: transaction.totalCopies,
    items: [
      {
        ...transaction.items[0],
        availableStock: book.stock,
        remainingStock: book.stock - 2,
      },
    ],
  };
  store.setState({
    books: [book],
    lendingPreview: preview,
    lendingDraft: {
      borrowerName: transaction.borrowerName,
      borrowerPhone: transaction.borrowerPhone,
      dueDate: transaction.dueDate,
      items: [{ bookId: book.id, quantity: 2 }],
    },
  });
  assert.equal((await store.getState().confirmLending()).id, transaction.id);
  await settle();
  assert.equal(store.getState().lendingPreview, null);
  assert.deepEqual(store.getState().lendingDraft.items, []);
  assert.equal(store.getState().books[0].stock, 148);
  assert.equal(store.getState().lendings[0].id, transaction.id);

  await store.getState().returnLending(transaction.id);
  await settle();
  assert.equal(store.getState().books[0].stock, 150);
  assert.equal(store.getState().lendings[0].status, 'Returned');
  assert.deepEqual(mutations, [
    'POST /api/books',
    'PATCH /api/books/b1',
    'DELETE /api/books/b1',
    'POST /api/lendings',
    'PATCH /api/lendings/l1/return',
  ]);
});

test('draft quantities respect the server limit and remove zero-stock items', () => {
  const store = useLibraryStore;
  store.getState().clearSessionData();
  assert.equal(store.getState().isLoading, true);
  store.setState({ books: [book] });
  store.getState().addBookToDraft(book.id);
  store.getState().updateDraftItemQuantity(book.id, 150);
  store.getState().addBookToDraft(book.id);
  assert.equal(store.getState().lendingDraft.items[0].quantity, 100);

  store.setState({ books: [{ ...book, stock: 0 }] });
  store.getState().updateDraftItemQuantity(book.id, 1);
  assert.deepEqual(store.getState().lendingDraft.items, []);
});

test('failed logout clears local state immediately and reports server revocation failure', async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });
  let releaseLogout!: (response: Response) => void;
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    if (String(input) === '/api/auth/login') return json(session);
    if (String(input) === '/api/auth/logout') {
      return new Promise<Response>((resolve) => {
        releaseLogout = resolve;
      });
    }
    throw new Error(`Unexpected request ${String(input)}`);
  }) as typeof fetch;
  await authApi.login({ email: session.user.email, password: 'password' });
  useLibraryStore.setState({ books: [book], lendings: [transaction] });
  useAuthStore.setState({
    phase: 'authenticated',
    user: session.user,
    isSubmitting: false,
  });
  const logoutPromise = useAuthStore.getState().logout();
  // Immediately cleared before server responds
  assert.equal(useAuthStore.getState().phase, 'login');
  assert.equal(useAuthStore.getState().user, null);
  assert.deepEqual(useLibraryStore.getState().books, []);
  assert.deepEqual(useLibraryStore.getState().lendings, []);
  assert.equal(getAccessToken(), null);

  releaseLogout(json({ error: 'Unavailable' }, 503));
  await logoutPromise;
  assert.equal(useAuthStore.getState().phase, 'login');
  assert.match(
    useAuthStore.getState().error ?? '',
    /server session may still be active/i
  );
  assert.equal(getAccessToken(), null);
});

test('logout waits for an in-flight refresh and stale requests cannot restore the session', async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });
  let releaseRefresh!: (response: Response) => void;
  let markRefreshStarted!: () => void;
  const refreshStarted = new Promise<void>((resolve) => {
    markRefreshStarted = resolve;
  });
  const refreshResponse = new Promise<Response>((resolve) => {
    releaseRefresh = resolve;
  });
  const requests: string[] = [];
  let logoutAuthHeader: string | null = null;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const path = String(input);
    requests.push(path);
    if (path === '/api/auth/login') return json(session);
    if (path.startsWith('/api/books')) return json({ error: 'Expired' }, 401);
    if (path === '/api/auth/refresh') {
      markRefreshStarted();
      return refreshResponse;
    }
    if (path === '/api/auth/logout') {
      logoutAuthHeader =
        (init?.headers as Record<string, string> | undefined)?.Authorization ?? null;
      return json({ ok: true });
    }
    throw new Error(`Unexpected request ${path}`);
  }) as typeof fetch;
  await authApi.login({ email: session.user.email, password: 'password' });
  useAuthStore.setState({
    phase: 'authenticated',
    user: session.user,
    isSubmitting: false,
  });
  const request = assert.rejects(libraryApi.listBooks(), /session has changed/i);
  await refreshStarted;
  const logout = useAuthStore.getState().logout();
  assert.equal(getAccessToken(), null);
  assert.equal(requests.includes('/api/auth/logout'), false);
  releaseRefresh(json({ ...session, accessToken: 'rotated-token' }));
  await logout;
  await request;
  assert.equal(logoutAuthHeader, 'Bearer rotated-token');
  assert.equal(getAccessToken(), null);
  assert.equal(useAuthStore.getState().phase, 'login');
  assert.deepEqual(requests, [
    '/api/auth/login',
    '/api/books',
    '/api/auth/refresh',
    '/api/auth/logout',
  ]);
});

test('failed in-flight refresh leaves logout revocation uncertain on 5xx but clean on 401', async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });
  let releaseRefresh!: (response: Response) => void;
  let markRefreshStarted!: () => void;
  const refreshStarted = new Promise<void>((resolve) => {
    markRefreshStarted = resolve;
  });
  const refreshResponse = new Promise<Response>((resolve) => {
    releaseRefresh = resolve;
  });
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const path = String(input);
    if (path === '/api/auth/login') return json(session);
    if (path === '/api/books') return json({ error: 'Expired' }, 401);
    if (path === '/api/auth/refresh') {
      markRefreshStarted();
      return refreshResponse;
    }
    if (path === '/api/auth/logout') return json({ ok: true });
    throw new Error(`Unexpected request ${path}`);
  }) as typeof fetch;
  await authApi.login({ email: session.user.email, password: 'password' });
  useAuthStore.setState({
    phase: 'authenticated',
    user: session.user,
    isSubmitting: false,
  });
  const request = assert.rejects(libraryApi.listBooks(), /session has changed/i);
  await refreshStarted;
  const logout = useAuthStore.getState().logout();
  releaseRefresh(json({ error: 'Unavailable' }, 503));
  await logout;
  await request;
  assert.match(
    useAuthStore.getState().error ?? '',
    /server session may still be active/i
  );
  assert.equal(getAccessToken(), null);

  // Now verify 401 on in-flight refresh does NOT emit logoutUnconfirmed
  let releaseRefresh401!: (response: Response) => void;
  let markRefresh401Started!: () => void;
  const refresh401Started = new Promise<void>((resolve) => {
    markRefresh401Started = resolve;
  });
  const refresh401Response = new Promise<Response>((resolve) => {
    releaseRefresh401 = resolve;
  });
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const path = String(input);
    if (path === '/api/auth/login') return json(session);
    if (path === '/api/books') return json({ error: 'Expired' }, 401);
    if (path === '/api/auth/refresh') {
      markRefresh401Started();
      return refresh401Response;
    }
    if (path === '/api/auth/logout') return json({ ok: true });
    throw new Error(`Unexpected request ${path}`);
  }) as typeof fetch;
  await authApi.login({ email: session.user.email, password: 'password' });
  useAuthStore.setState({
    phase: 'authenticated',
    user: session.user,
    isSubmitting: false,
    error: null,
  });
  const req2 = assert.rejects(libraryApi.listBooks(), /session has changed/i);
  await refresh401Started;
  const logout2 = useAuthStore.getState().logout();
  releaseRefresh401(json({ error: 'Expired' }, 401));
  await logout2;
  await req2;
  assert.equal(useAuthStore.getState().error, null);
});

test('a 401 received after logout cannot trigger refresh', async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });
  let releaseBooks!: (response: Response) => void;
  const requests: string[] = [];
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const path = String(input);
    requests.push(path);
    if (path === '/api/auth/login') return json(session);
    if (path === '/api/auth/logout') return json({ ok: true });
    if (path === '/api/books')
      return new Promise<Response>((resolve) => {
        releaseBooks = resolve;
      });
    throw new Error(`Unexpected request ${path}`);
  }) as typeof fetch;
  await authApi.login({ email: session.user.email, password: 'password' });
  const request = assert.rejects(libraryApi.listBooks(), /session has changed/i);
  await authApi.logout();
  releaseBooks(json({ error: 'Expired' }, 401));
  await request;
  assert.deepEqual(requests, ['/api/auth/login', '/api/books', '/api/auth/logout']);
  assert.equal(getAccessToken(), null);
});

test('late catalog responses cannot repopulate data after session clear', async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });
  const pending: Array<{ path: string; resolve: (response: Response) => void }> = [];
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const path = String(input);
    if (path === '/api/auth/login') return json(session);
    if (path === '/api/auth/logout') return json({ ok: true });
    return new Promise<Response>((resolve) => pending.push({ path, resolve }));
  }) as typeof fetch;
  await authApi.login({ email: session.user.email, password: 'password' });
  useLibraryStore.getState().clearSessionData();
  const loading = useLibraryStore.getState().initialize();
  assert.equal(pending.length, 3);
  useLibraryStore.getState().clearSessionData();
  await authApi.logout();
  for (const request of pending) {
    request.resolve(
      json(
        request.path.startsWith('/api/books')
          ? { books: [book] }
          : request.path === '/api/genres'
            ? { genres: [book.genre] }
            : { lendings: [transaction] }
      )
    );
  }
  await loading;
  assert.deepEqual(useLibraryStore.getState().books, []);
  assert.deepEqual(useLibraryStore.getState().genres, []);
  assert.deepEqual(useLibraryStore.getState().lendings, []);
  assert.deepEqual(useToastStore.getState().toasts, []);
});

test('200 OK HTML response throws ApiClientError with invalidServerResponse', async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });
  globalThis.fetch = (async () =>
    new Response('<!doctype html><html><body>Login</body></html>', {
      status: 200,
      headers: { 'Content-Type': 'text/html' },
    })) as typeof fetch;

  await assert.rejects(
    authApi.getStatus(),
    (error: unknown) =>
      error instanceof ApiClientError &&
      error.status === 200 &&
      error.message ===
        TRANSLATIONS[useLocaleStore.getState().locale].auth.errors.invalidServerResponse
  );
});

test('transient 5xx during silent refresh keeps token and session intact; 401 logs out and clears library data', async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const path = String(input);
    if (path === '/api/auth/login') return json(session);
    if (path === '/api/books') return json({ error: 'Expired' }, 401);
    if (path === '/api/auth/refresh') return json({ error: 'DB hiccup' }, 503);
    throw new Error(`Unexpected request ${path}`);
  }) as typeof fetch;

  await authApi.login({ email: session.user.email, password: 'password' });
  useAuthStore.setState({
    phase: 'authenticated',
    user: session.user,
    fieldErrors: { email: 'stale' },
  });
  useLibraryStore.setState({ books: [book] });

  await assert.rejects(
    libraryApi.listBooks(),
    (err: unknown) => err instanceof ApiClientError && err.status === 503
  );
  assert.equal(getAccessToken(), session.accessToken);
  assert.equal(useAuthStore.getState().phase, 'authenticated');
  assert.equal(useLibraryStore.getState().books.length, 1);

  // Now simulate real 401 on refresh -> wipes token, clears fieldErrors & library data
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const path = String(input);
    if (path === '/api/books') return json({ error: 'Expired' }, 401);
    if (path === '/api/auth/refresh') return json({ error: 'Revoked' }, 401);
    throw new Error(`Unexpected request ${path}`);
  }) as typeof fetch;

  await assert.rejects(
    libraryApi.listBooks(),
    (err: unknown) => err instanceof ApiClientError && err.status === 401
  );
  assert.equal(getAccessToken(), null);
  assert.equal(useAuthStore.getState().phase, 'login');
  assert.deepEqual(useAuthStore.getState().fieldErrors, {});
  assert.deepEqual(useLibraryStore.getState().books, []);
});

test('bootstrap surfaces transient refresh 5xx as db-disconnected and sanitizes malformed defaultProfile', async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const path = String(input);
    if (path === '/api/auth/status') {
      return json({
        databaseConnected: true,
        needsSetup: false,
        hasSessionCookie: true,
        defaultProfile: null,
      });
    }
    if (path === '/api/auth/refresh') return json({ error: 'Server error' }, 503);
    throw new Error(`Unexpected request ${path}`);
  }) as typeof fetch;

  await useAuthStore.getState().bootstrap();
  assert.equal(useAuthStore.getState().phase, 'db-disconnected');
  assert.equal(useAuthStore.getState().defaultProfile.name, 'Mei Lin');
  assert.equal(useAuthStore.getState().defaultProfile.email, 'mei@communitylibrary.org');
});

test('concurrent changePassword coordinates with 401 on another request without logging out', async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });
  let releasePasswordChange!: (response: Response) => void;
  let releaseBooksFirst!: (response: Response) => void;
  let booksCalls = 0;
  let lastBooksAuth = '';
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const path = String(input);
    if (path === '/api/auth/login') return json(session);
    if (path === '/api/auth/password') {
      return new Promise<Response>((resolve) => {
        releasePasswordChange = resolve;
      });
    }
    if (path === '/api/books') {
      booksCalls += 1;
      lastBooksAuth =
        (init?.headers as Record<string, string> | undefined)?.Authorization ?? '';
      if (booksCalls === 1) {
        return new Promise<Response>((resolve) => {
          releaseBooksFirst = resolve;
        });
      }
      return json({ books: [book] });
    }
    throw new Error(`Unexpected request ${path}`);
  }) as typeof fetch;

  await authApi.login({ email: session.user.email, password: 'password' });
  useAuthStore.setState({ phase: 'authenticated', user: session.user });

  const pwPromise = authApi.changePassword({
    currentPassword: 'old-password',
    newPassword: 'new-password-123',
  });
  const booksPromise = libraryApi.listBooks();
  await settle();

  // Books request gets 401 because server rotated tokens during password change
  releaseBooksFirst(json({ error: 'Expired' }, 401));
  await settle();

  // Password change resolves with the fresh token
  releasePasswordChange(json({ ...session, accessToken: 'fresh-pw-token' }));
  const [pwSession, booksResult] = await Promise.all([pwPromise, booksPromise]);

  assert.equal(pwSession.accessToken, 'fresh-pw-token');
  assert.equal(getAccessToken(), 'fresh-pw-token');
  assert.equal(lastBooksAuth, 'Bearer fresh-pw-token');
  assert.equal(booksResult.length, 1);
  assert.equal(useAuthStore.getState().phase, 'authenticated');
});

test('reconcileCatalogState clamps/removes draft items, clears invalid preview, and resets removed genre', async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });
  const book2: Book = { ...book, id: 'b2', title: 'Second', genre: 'Sci-Fi', stock: 5 };
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const path = String(input);
    if (path === '/api/auth/login') return json(session);
    if (path.startsWith('/api/books')) {
      return json({ books: [{ ...book, stock: 1 }] });
    }
    if (path === '/api/genres') return json({ genres: ['Fiction'] });
    if (path === '/api/lendings') return json({ lendings: [] });
    throw new Error(`Unexpected request ${path}`);
  }) as typeof fetch;

  await authApi.login({ email: session.user.email, password: 'password' });
  const store = useLibraryStore;
  store.getState().clearSessionData();
  const preview: LendingPreview = {
    borrowerName: 'Reader',
    borrowerPhone: '12345678',
    dueDate: '2099-01-01',
    totalTitles: 1,
    totalCopies: 3,
    items: [
      {
        bookId: book.id,
        bookTitle: book.title,
        author: book.author,
        genre: book.genre,
        quantity: 3,
        availableStock: 10,
        remainingStock: 7,
      },
    ],
  };
  store.setState({
    books: [{ ...book, stock: 10 }, book2],
    genres: ['Fiction', 'Sci-Fi'],
    selectedGenre: 'Sci-Fi',
    lendingDraft: {
      borrowerName: 'Reader',
      borrowerPhone: '12345678',
      dueDate: '2099-01-01',
      items: [
        { bookId: book.id, quantity: 3 },
        { bookId: book2.id, quantity: 2 },
      ],
    },
    lendingPreview: preview,
    lendingSnapshot: {
      borrowerName: 'Reader',
      borrowerPhone: '12345678',
      dueDate: '2099-01-01',
      items: [{ bookId: book.id, quantity: 3 }],
    },
  });

  await store.getState().refreshCatalog();
  assert.deepEqual(store.getState().lendingDraft.items, [
    { bookId: book.id, quantity: 1 },
  ]);
  assert.equal(store.getState().lendingPreview, null);
  assert.equal(store.getState().selectedGenre, ALL_GENRES_FILTER);
});

test('in-flight refreshCatalog cannot double-apply adjustStock, returnLending updates in place, and modal errors skip duplicate toasts', async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });
  let releaseRefreshBooks!: (response: Response) => void;
  let refreshCall = 0;
  const tx1: LendingTransaction = { ...transaction, id: 'l1', referenceCode: 'MCL-1' };
  const tx2: LendingTransaction = { ...transaction, id: 'l2', referenceCode: 'MCL-2' };
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const path = String(input);
    const method = init?.method ?? 'GET';
    if (path === '/api/auth/login') return json(session);
    if (method === 'GET' && path.startsWith('/api/books')) {
      refreshCall += 1;
      if (refreshCall === 1) {
        return new Promise<Response>((resolve) => {
          releaseRefreshBooks = resolve;
        });
      }
      return json({ error: 'skip' }, 503);
    }
    if (method === 'GET' && path === '/api/genres') return json({ genres: ['Fiction'] });
    if (method === 'GET' && path === '/api/lendings')
      return json({ lendings: [tx1, tx2] });
    if (method === 'PATCH' && path === '/api/lendings/l2/return') {
      return json({
        transaction: {
          ...tx2,
          status: 'Returned',
          returnedAt: '2026-01-03T00:00:00.000Z',
        },
      });
    }
    if (method === 'DELETE' && path === '/api/books/b1') {
      return json({ error: 'Delete failed' }, 500);
    }
    if (method === 'POST' && path === '/api/lendings') {
      return json({ error: 'Checkout failed' }, 409);
    }
    throw new Error(`Unexpected request ${method} ${path}`);
  }) as typeof fetch;

  await authApi.login({ email: session.user.email, password: 'password' });
  const store = useLibraryStore;
  store.getState().clearSessionData();
  store.setState({
    books: [{ ...book, stock: 10 }],
    lendings: [tx1, tx2],
  });

  // Start a refreshCatalog, then immediately call returnLending(tx2.id)
  const staleRefresh = store.getState().refreshCatalog();
  const returnPromise = store.getState().returnLending(tx2.id);
  // Stale refresh resolves with already-incremented stock (12)
  releaseRefreshBooks(json({ books: [{ ...book, stock: 12 }] }));
  await Promise.all([staleRefresh, returnPromise]);

  // Stock should be 10 + 2 = 12 (not 12 + 2 = 14)
  assert.equal(store.getState().books[0].stock, 12);
  // Row order preserved in place: [tx1, tx2(Returned)]
  assert.deepEqual(
    store.getState().lendings.map((l) => `${l.id}:${l.status}`),
    ['l1:Active', 'l2:Returned']
  );

  await settle();

  // removeBook & confirmLending errors should rethrow WITHOUT pushing error toasts
  useToastStore.getState().clearToasts();
  await assert.rejects(store.getState().removeBook('b1', 'A Book'), /Delete failed/);
  assert.equal(useToastStore.getState().toasts.length, 0);

  store.setState({
    lendingPreview: {
      borrowerName: 'Reader',
      borrowerPhone: '12345678',
      dueDate: '2099-01-01',
      totalTitles: 1,
      totalCopies: 1,
      items: [],
    },
    lendingSnapshot: null,
  });
  await assert.rejects(store.getState().confirmLending(), /Checkout failed/);
  assert.equal(useToastStore.getState().toasts.length, 0);
});

test('syncDraftDueDate advances default due date across midnight while preserving future user edits', () => {
  const store = useLibraryStore;
  store.getState().clearSessionData();
  assert.equal(store.getState().dueDateTouched, false);

  store.getState().syncDraftDueDate('2026-12-31');
  assert.equal(store.getState().lendingDraft.dueDate, '2027-01-14');

  // Untouched draft advances on new day
  store.getState().syncDraftDueDate('2027-01-01');
  assert.equal(store.getState().lendingDraft.dueDate, '2027-01-15');

  // User-picked future date stays put
  store.getState().setDraftField('dueDate', '2027-01-05');
  assert.equal(store.getState().dueDateTouched, true);
  store.getState().syncDraftDueDate('2027-01-02');
  assert.equal(store.getState().lendingDraft.dueDate, '2027-01-05');

  // Once user-picked date falls behind today, it rolls forward to today + 14
  store.getState().syncDraftDueDate('2027-01-06');
  assert.equal(store.getState().lendingDraft.dueDate, '2027-01-20');

  // resetDraft resets dueDateTouched
  store.getState().resetDraft();
  assert.equal(store.getState().dueDateTouched, false);
});
