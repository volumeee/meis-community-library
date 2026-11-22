import { create } from 'zustand';
import {
  TRANSLATIONS,
  type Locale,
  type TranslationDictionary,
} from '../i18n/translations';
import { setApiErrorFormatter } from '../services/api';

const LOCALE_STORAGE_KEY = 'mcl-lang';

function resolveInitialLocale(): Locale {
  if (typeof window === 'undefined') return 'en';
  try {
    const saved = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    if (saved === 'en' || saved === 'id') {
      return saved;
    }
  } catch {
    // Ignore storage read errors in restricted frames
  }
  return 'en';
}

function applyDocumentLang(locale: Locale): void {
  if (typeof document !== 'undefined') {
    document.documentElement.lang = locale;
    document.title = TRANSLATIONS[locale].meta.brandFull;
  }
}

interface LocaleState {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
}

const initialLocale = resolveInitialLocale();
applyDocumentLang(initialLocale);

export const useLocaleStore = create<LocaleState>((set, get) => ({
  locale: initialLocale,
  setLocale: (locale) => {
    applyDocumentLang(locale);
    try {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    } catch {
      // Ignore storage write errors
    }
    set({ locale });
  },
  toggleLocale: () => {
    const next: Locale = get().locale === 'en' ? 'id' : 'en';
    get().setLocale(next);
  },
}));

setApiErrorFormatter((code, status) => {
  const message = TRANSLATIONS[useLocaleStore.getState().locale].auth.errors[code];
  return code === 'genericRequestFailed' && status !== undefined
    ? `${message} (${status})`
    : message;
});

export function useI18n(): {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
  t: TranslationDictionary;
} {
  const locale = useLocaleStore((s) => s.locale);
  const setLocale = useLocaleStore((s) => s.setLocale);
  const toggleLocale = useLocaleStore((s) => s.toggleLocale);
  return {
    locale,
    setLocale,
    toggleLocale,
    t: TRANSLATIONS[locale],
  };
}
