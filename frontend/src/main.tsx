import { Component, type ErrorInfo, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { TRANSLATIONS } from './i18n/translations';
import { useLocaleStore } from './store/useLocaleStore';
import './index.css';

interface ErrorBoundaryState {
  hasError: boolean;
}

class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Unhandled application error:', error, info.componentStack);
  }

  render(): ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }
    const t = TRANSLATIONS[useLocaleStore.getState().locale].errorBoundary;
    return (
      <div
        role="alert"
        className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#0b1120] text-slate-900 dark:text-slate-100 px-4"
      >
        <div className="max-w-md w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-surface-dark p-6 shadow-sm text-center space-y-4">
          <h1 className="font-display text-lg font-semibold text-slate-900 dark:text-slate-50">
            {t.title}
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-300">{t.message}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex items-center justify-center h-10 px-4 text-sm font-medium text-white bg-accent dark:bg-blue-600 rounded-md hover:bg-accent-hover dark:hover:bg-blue-500 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent dark:focus-visible:outline-blue-400"
          >
            {t.reload}
          </button>
        </div>
      </div>
    );
  }
}

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
