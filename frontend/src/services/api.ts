import type {
  ApiErrorResponse,
  AuthSessionResponse,
  AuthStatusResponse,
  Book,
  BookQuery,
  CreateBookInput,
  CreateLendingInput,
  LendingPreview,
  LendingTransaction,
  UpdateBookInput,
} from '@shared/library';

export type ApiErrorCode =
  | 'genericRequestFailed'
  | 'invalidServerResponse'
  | 'sessionExpired'
  | 'sessionChanged'
  | 'logoutUnconfirmed';

type ApiErrorFormatter = (code: ApiErrorCode, status?: number) => string;

const DEFAULT_ERROR_MESSAGES: Record<ApiErrorCode, string> = {
  genericRequestFailed: 'Request failed',
  invalidServerResponse: 'The server returned an invalid response. Please try again.',
  sessionExpired: 'Session expired. Please sign in again.',
  sessionChanged: 'Session changed',
  logoutUnconfirmed:
    'Signed out locally, but the server session may still be active. Please retry when reconnected.',
};

let formatApiError: ApiErrorFormatter = (code, status) =>
  code === 'genericRequestFailed' && status !== undefined
    ? `${DEFAULT_ERROR_MESSAGES[code]} (${status})`
    : DEFAULT_ERROR_MESSAGES[code];

export function setApiErrorFormatter(formatter: ApiErrorFormatter): void {
  formatApiError = formatter;
}

export class ApiClientError extends Error {
  public readonly status: number;
  public readonly fieldErrors?: Record<string, string>;
  public readonly code?: ApiErrorCode;

  constructor(
    status: number,
    message: string,
    fieldErrors?: Record<string, string>,
    code?: ApiErrorCode
  ) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.fieldErrors = fieldErrors;
    this.code = code;
  }
}

// Keep short-lived JWT access token strictly in JS memory (never localStorage/sessionStorage).
type RefreshResult =
  | { kind: 'ok'; session: AuthSessionResponse }
  | { kind: 'unauthorized' }
  | { kind: 'error'; error: unknown };

let inMemoryAccessToken: string | null = null;
let onUnauthorizedCallback: (() => void) | null = null;
let refreshInFlight: Promise<RefreshResult> | null = null;
let passwordChangeInFlight: Promise<AuthSessionResponse> | null = null;
let sessionVersion = 0;
let tokenGeneration = 0;

function assignAccessToken(token: string | null): void {
  tokenGeneration += 1;
  inMemoryAccessToken = token;
}

export function setAccessToken(token: string | null): void {
  if (token === null) sessionVersion += 1;
  assignAccessToken(token);
}

export function getAccessToken(): string | null {
  return inMemoryAccessToken;
}

export function setOnUnauthorizedHandler(handler: (() => void) | null): void {
  onUnauthorizedCallback = handler;
}

async function rawFetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const signal =
    init?.signal ??
    (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function'
      ? AbortSignal.timeout(30_000)
      : undefined);

  const response = await fetch(url, {
    credentials: 'include',
    ...init,
    ...(signal ? { signal } : {}),
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as Partial<ApiErrorResponse>;
    throw new ApiClientError(
      response.status,
      data.error ?? formatApiError('genericRequestFailed', response.status),
      data.fieldErrors,
      data.error ? undefined : 'genericRequestFailed'
    );
  }

  try {
    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new ApiClientError(
        response.status,
        formatApiError('invalidServerResponse'),
        undefined,
        'invalidServerResponse'
      );
    }
    throw error;
  }
}

async function trySilentRefresh(): Promise<RefreshResult> {
  if (!refreshInFlight) {
    const version = sessionVersion;
    const gen = tokenGeneration;
    refreshInFlight = rawFetchJson<AuthSessionResponse>('/api/auth/refresh', {
      method: 'POST',
    })
      .then((session): RefreshResult => {
        if (version === sessionVersion && gen === tokenGeneration) {
          assignAccessToken(session.accessToken);
        }
        return { kind: 'ok', session };
      })
      .catch((error: unknown): RefreshResult => {
        if (error instanceof ApiClientError && error.status === 401) {
          if (version === sessionVersion && gen === tokenGeneration) {
            assignAccessToken(null);
          }
          return { kind: 'unauthorized' };
        }
        return { kind: 'error', error };
      })
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
}

async function requestAuthenticatedJson<T>(
  url: string,
  init?: RequestInit,
  allowRetry = true,
  isPasswordChange = false
): Promise<T> {
  const version = sessionVersion;
  const usedToken = inMemoryAccessToken;
  if (!usedToken) {
    throw new ApiClientError(
      401,
      formatApiError('sessionExpired'),
      undefined,
      'sessionExpired'
    );
  }
  const headers: Record<string, string> = {
    ...(init?.headers as Record<string, string> | undefined),
    Authorization: `Bearer ${usedToken}`,
  };

  try {
    const result = await rawFetchJson<T>(url, { ...init, headers });
    if (version !== sessionVersion) {
      throw new Error(formatApiError('sessionChanged'));
    }
    return result;
  } catch (error) {
    if (version !== sessionVersion) {
      throw new Error(formatApiError('sessionChanged'), { cause: error });
    }
    if (error instanceof ApiClientError && error.status === 401) {
      if (allowRetry) {
        if (!isPasswordChange && passwordChangeInFlight) {
          await passwordChangeInFlight.catch(() => undefined);
          if (version !== sessionVersion) {
            throw new Error(formatApiError('sessionChanged'), { cause: error });
          }
          if (inMemoryAccessToken && inMemoryAccessToken !== usedToken) {
            return requestAuthenticatedJson<T>(url, init, false, false);
          }
        }
        if (inMemoryAccessToken && inMemoryAccessToken !== usedToken) {
          return requestAuthenticatedJson<T>(url, init, false, isPasswordChange);
        }
        const refreshed = await trySilentRefresh();
        if (version !== sessionVersion) {
          throw new Error(formatApiError('sessionChanged'), { cause: error });
        }
        if (refreshed.kind === 'ok') {
          return requestAuthenticatedJson<T>(url, init, false, isPasswordChange);
        }
        if (refreshed.kind === 'error') {
          throw refreshed.error;
        }
        if (inMemoryAccessToken && inMemoryAccessToken !== usedToken) {
          return requestAuthenticatedJson<T>(url, init, false, isPasswordChange);
        }
        onUnauthorizedCallback?.();
        throw new ApiClientError(
          401,
          formatApiError('sessionExpired'),
          undefined,
          'sessionExpired'
        );
      }
      if (!isPasswordChange && passwordChangeInFlight) {
        await passwordChangeInFlight.catch(() => undefined);
        if (version !== sessionVersion) {
          throw new Error(formatApiError('sessionChanged'), { cause: error });
        }
      }
      if (!isPasswordChange && inMemoryAccessToken && inMemoryAccessToken !== usedToken) {
        return requestAuthenticatedJson<T>(url, init, false, false);
      }
      onUnauthorizedCallback?.();
      throw new ApiClientError(
        401,
        formatApiError('sessionExpired'),
        undefined,
        'sessionExpired'
      );
    }
    throw error;
  }
}

export const authApi = {
  async getStatus(): Promise<AuthStatusResponse> {
    return rawFetchJson<AuthStatusResponse>('/api/auth/status');
  },

  async setup(input: {
    name: string;
    email: string;
    password: string;
    setupToken?: string;
  }): Promise<AuthSessionResponse> {
    setAccessToken(null);
    const version = sessionVersion;
    if (refreshInFlight) await refreshInFlight;
    if (version !== sessionVersion) throw new Error(formatApiError('sessionChanged'));
    const headers: Record<string, string> = {};
    if (input.setupToken?.trim()) {
      headers['X-Setup-Token'] = input.setupToken.trim();
    }
    const session = await rawFetchJson<AuthSessionResponse>('/api/auth/setup', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: input.name,
        email: input.email,
        password: input.password,
      }),
    });
    if (version !== sessionVersion) throw new Error(formatApiError('sessionChanged'));
    assignAccessToken(session.accessToken);
    return session;
  },

  async login(input: { email: string; password: string }): Promise<AuthSessionResponse> {
    setAccessToken(null);
    const version = sessionVersion;
    if (refreshInFlight) await refreshInFlight;
    if (version !== sessionVersion) throw new Error(formatApiError('sessionChanged'));
    const session = await rawFetchJson<AuthSessionResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    if (version !== sessionVersion) throw new Error(formatApiError('sessionChanged'));
    assignAccessToken(session.accessToken);
    return session;
  },

  async refresh(): Promise<AuthSessionResponse | null> {
    const result = await trySilentRefresh();
    if (result.kind === 'ok') return result.session;
    if (result.kind === 'unauthorized') return null;
    throw result.error;
  },

  async logout(): Promise<void> {
    const pendingRefresh = refreshInFlight;
    const tokenForRevocation = inMemoryAccessToken;
    setAccessToken(null);
    const refreshed = pendingRefresh ? await pendingRefresh : undefined;
    const effectiveToken =
      refreshed?.kind === 'ok' ? refreshed.session.accessToken : tokenForRevocation;
    const headers: Record<string, string> = {};
    if (effectiveToken) {
      headers.Authorization = `Bearer ${effectiveToken}`;
    }
    await rawFetchJson<{ ok: boolean }>('/api/auth/logout', {
      method: 'POST',
      headers,
    });
    if (refreshed?.kind === 'error') {
      throw new Error(formatApiError('logoutUnconfirmed'));
    }
  },

  async changePassword(input: {
    currentPassword: string;
    newPassword: string;
  }): Promise<AuthSessionResponse> {
    const version = sessionVersion;
    if (refreshInFlight) await refreshInFlight;
    if (version !== sessionVersion) throw new Error(formatApiError('sessionChanged'));
    tokenGeneration += 1;
    const task = (async () => {
      const session = await requestAuthenticatedJson<AuthSessionResponse>(
        '/api/auth/password',
        {
          method: 'PATCH',
          body: JSON.stringify(input),
        },
        true,
        true
      );
      if (version !== sessionVersion) throw new Error(formatApiError('sessionChanged'));
      assignAccessToken(session.accessToken);
      return session;
    })();
    passwordChangeInFlight = task;
    try {
      return await task;
    } finally {
      if (passwordChangeInFlight === task) {
        passwordChangeInFlight = null;
      }
    }
  },
};

export const libraryApi = {
  async listBooks(query: BookQuery = {}): Promise<Book[]> {
    const params = new URLSearchParams();
    if (query.genre && query.genre.trim()) {
      params.set('genre', query.genre);
    }
    if (query.sortBy) params.set('sortBy', query.sortBy);
    if (query.sortOrder) params.set('sortOrder', query.sortOrder);
    if (query.search && query.search.trim()) params.set('search', query.search.trim());
    const qs = params.toString();
    const res = await requestAuthenticatedJson<{ books: Book[] }>(
      `/api/books${qs ? `?${qs}` : ''}`
    );
    return res.books;
  },

  async listGenres(): Promise<string[]> {
    const res = await requestAuthenticatedJson<{ genres: string[] }>('/api/genres');
    return res.genres;
  },

  async addBook(input: CreateBookInput): Promise<Book> {
    const res = await requestAuthenticatedJson<{ book: Book }>('/api/books', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return res.book;
  },

  async updateBook(id: string, input: UpdateBookInput): Promise<Book> {
    const res = await requestAuthenticatedJson<{ book: Book }>(
      `/api/books/${encodeURIComponent(id)}`,
      {
        method: 'PATCH',
        body: JSON.stringify(input),
      }
    );
    return res.book;
  },

  async removeBook(id: string): Promise<void> {
    await requestAuthenticatedJson<{ deleted: boolean }>(
      `/api/books/${encodeURIComponent(id)}`,
      { method: 'DELETE' }
    );
  },

  async listLendings(): Promise<LendingTransaction[]> {
    const res = await requestAuthenticatedJson<{ lendings: LendingTransaction[] }>(
      '/api/lendings'
    );
    return res.lendings;
  },

  async previewLending(input: CreateLendingInput): Promise<LendingPreview> {
    const res = await requestAuthenticatedJson<{ preview: LendingPreview }>(
      '/api/lendings/preview',
      {
        method: 'POST',
        body: JSON.stringify(input),
      }
    );
    return res.preview;
  },

  async confirmLending(input: CreateLendingInput): Promise<LendingTransaction> {
    const res = await requestAuthenticatedJson<{ transaction: LendingTransaction }>(
      '/api/lendings',
      {
        method: 'POST',
        body: JSON.stringify(input),
      }
    );
    return res.transaction;
  },

  async returnLending(id: string): Promise<LendingTransaction> {
    const res = await requestAuthenticatedJson<{ transaction: LendingTransaction }>(
      `/api/lendings/${encodeURIComponent(id)}/return`,
      { method: 'PATCH' }
    );
    return res.transaction;
  },
};
