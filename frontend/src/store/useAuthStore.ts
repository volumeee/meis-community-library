import { create } from 'zustand';
import { TRANSLATIONS } from '../i18n/translations';
import {
  ApiClientError,
  authApi,
  setAccessToken,
  setOnUnauthorizedHandler,
} from '../services/api';
import type { AuthUser } from '@shared/library';
import { useLibraryStore } from './useLibraryStore';
import { useLocaleStore } from './useLocaleStore';

export type AuthPhase =
  'checking' | 'db-disconnected' | 'setup' | 'login' | 'authenticated';

export interface ChangePasswordResult {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
}

const DEFAULT_PROFILE = {
  name: 'Mei Lin',
  email: 'mei@communitylibrary.org',
};

function getAuthErrors() {
  return TRANSLATIONS[useLocaleStore.getState().locale].auth.errors;
}

function sanitizeDefaultProfile(profile: unknown): { name: string; email: string } {
  if (!profile || typeof profile !== 'object') return { ...DEFAULT_PROFILE };
  const candidate = profile as { name?: unknown; email?: unknown };
  return {
    name:
      typeof candidate.name === 'string' && candidate.name.trim()
        ? candidate.name
        : DEFAULT_PROFILE.name,
    email:
      typeof candidate.email === 'string' && candidate.email.trim()
        ? candidate.email
        : DEFAULT_PROFILE.email,
  };
}

interface AuthState {
  phase: AuthPhase;
  user: AuthUser | null;
  databaseError: string | null;
  requiresSetupToken: boolean;
  defaultProfile: {
    name: string;
    email: string;
  };
  isSubmitting: boolean;
  error: string | null;
  fieldErrors: Record<string, string>;

  bootstrap: () => Promise<void>;
  setupAccount: (input: {
    name: string;
    email: string;
    password: string;
    setupToken?: string;
  }) => Promise<boolean>;
  login: (input: { email: string; password: string }) => Promise<boolean>;
  logout: () => Promise<void>;
  changePassword: (input: {
    currentPassword: string;
    newPassword: string;
  }) => Promise<ChangePasswordResult>;
  clearErrors: () => void;
}
let authVersion = 0;

export const useAuthStore = create<AuthState>((set, get) => {
  setOnUnauthorizedHandler(() => {
    authVersion += 1;
    setAccessToken(null);
    useLibraryStore.getState().clearSessionData();
    set({
      user: null,
      phase: 'login',
      isSubmitting: false,
      error: getAuthErrors().sessionExpired,
      fieldErrors: {},
    });
  });

  return {
    phase: 'checking',
    user: null,
    databaseError: null,
    requiresSetupToken: false,
    defaultProfile: { ...DEFAULT_PROFILE },
    isSubmitting: false,
    error: null,
    fieldErrors: {},

    bootstrap: async () => {
      const version = ++authVersion;
      set({
        phase: 'checking',
        error: null,
        databaseError: null,
        fieldErrors: {},
      });
      try {
        const status = await authApi.getStatus();
        if (version !== authVersion) return;
        set({
          defaultProfile: sanitizeDefaultProfile(status.defaultProfile),
          requiresSetupToken: Boolean(status.requiresSetupToken),
        });
        if (!status.databaseConnected) {
          useLibraryStore.getState().clearSessionData();
          set({
            phase: 'db-disconnected',
            user: null,
            databaseError: status.databaseError ?? getAuthErrors().dbNotConnected,
          });
          return;
        }

        if (status.needsSetup) {
          useLibraryStore.getState().clearSessionData();
          set({ phase: 'setup', user: null });
          return;
        }

        if (status.hasSessionCookie) {
          const restored = await authApi.refresh();
          if (version !== authVersion) return;
          if (restored) {
            set({
              phase: 'authenticated',
              user: restored.user,
            });
            return;
          }
        }

        useLibraryStore.getState().clearSessionData();
        set({ phase: 'login', user: null });
      } catch {
        if (version !== authVersion) return;
        useLibraryStore.getState().clearSessionData();
        set({
          phase: 'db-disconnected',
          user: null,
          databaseError: getAuthErrors().serverUnreachable,
        });
      }
    },

    setupAccount: async (input) => {
      const version = ++authVersion;
      set({ isSubmitting: true, error: null, fieldErrors: {} });
      try {
        const session = await authApi.setup(input);
        if (version !== authVersion) return false;
        set({
          user: session.user,
          phase: 'authenticated',
          isSubmitting: false,
          error: null,
          fieldErrors: {},
        });
        return true;
      } catch (error) {
        if (version !== authVersion) return false;
        if (error instanceof ApiClientError) {
          // If another session already claimed setup, switch smoothly to login
          if (error.status === 409) {
            set({
              phase: 'login',
              isSubmitting: false,
              error: error.message,
              fieldErrors: {},
            });
            return false;
          }
          set({
            isSubmitting: false,
            error: error.message,
            fieldErrors: error.fieldErrors ?? {},
          });
        } else {
          set({
            isSubmitting: false,
            error: getAuthErrors().setupFailed,
          });
        }
        return false;
      }
    },

    login: async (input) => {
      const version = ++authVersion;
      set({ isSubmitting: true, error: null, fieldErrors: {} });
      try {
        const session = await authApi.login(input);
        if (version !== authVersion) return false;
        set({
          user: session.user,
          phase: 'authenticated',
          isSubmitting: false,
          error: null,
          fieldErrors: {},
        });
        return true;
      } catch (error) {
        if (version !== authVersion) return false;
        if (error instanceof ApiClientError) {
          set({
            isSubmitting: false,
            error: error.message,
            fieldErrors: error.fieldErrors ?? {},
          });
        } else {
          set({
            isSubmitting: false,
            error: getAuthErrors().loginFailed,
          });
        }
        return false;
      }
    },

    logout: async () => {
      if (get().isSubmitting) return;
      const version = ++authVersion;
      useLibraryStore.getState().clearSessionData();
      set({
        user: null,
        phase: 'login',
        error: null,
        fieldErrors: {},
        isSubmitting: false,
      });
      try {
        await authApi.logout();
      } catch {
        if (version !== authVersion) return;
        set({
          error: getAuthErrors().logoutUnconfirmed,
        });
      }
    },

    changePassword: async (input) => {
      const version = authVersion;
      try {
        const session = await authApi.changePassword(input);
        if (version !== authVersion) {
          return { ok: false, error: getAuthErrors().sessionChanged };
        }
        set({ user: session.user });
        return { ok: true };
      } catch (error) {
        if (version !== authVersion) {
          return { ok: false, error: getAuthErrors().sessionChanged };
        }
        if (error instanceof ApiClientError) {
          return {
            ok: false,
            error: error.message,
            fieldErrors: error.fieldErrors ?? {},
          };
        }
        return {
          ok: false,
          error: getAuthErrors().passwordChangeFailed,
        };
      }
    },

    clearErrors: () => set({ error: null, fieldErrors: {} }),
  };
});
