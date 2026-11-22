import { Globe } from 'lucide-react';
import { motion } from 'motion/react';
import type { Locale } from '../../i18n/translations';
import { useI18n } from '../../store/useLocaleStore';

interface LanguageToggleProps {
  variant?: 'compact' | 'sidebar';
  layoutGroup?: string;
}

export function LanguageToggle({
  variant = 'compact',
  layoutGroup = 'lang-pill',
}: LanguageToggleProps) {
  const { locale, setLocale, t } = useI18n();

  const options: Array<{ code: Locale; short: string; aria: string }> = [
    { code: 'id', short: 'ID', aria: t.language.switchToId },
    { code: 'en', short: 'EN', aria: t.language.switchToEn },
  ];

  if (variant === 'sidebar') {
    return (
      <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-md bg-slate-100/80 dark:bg-slate-800/70">
        <span className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300">
          <Globe
            className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400 shrink-0"
            aria-hidden="true"
          />
          <span>{t.language.label}</span>
        </span>
        <div
          role="group"
          aria-label={t.language.label}
          className="inline-flex items-center p-0.5 rounded bg-slate-200/80 dark:bg-slate-900/90"
        >
          {options.map((opt) => {
            const active = locale === opt.code;
            return (
              <button
                key={opt.code}
                type="button"
                onClick={() => setLocale(opt.code)}
                aria-pressed={active}
                aria-label={opt.aria}
                className={`relative px-2 py-1 text-[11px] font-mono font-semibold rounded transition-colors ${
                  active
                    ? 'text-slate-900 dark:text-slate-50'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {active && (
                  <motion.span
                    layoutId={`${layoutGroup}-sidebar`}
                    transition={{ type: 'spring', stiffness: 480, damping: 34 }}
                    className="absolute inset-0 rounded bg-white dark:bg-slate-700 shadow-xs"
                    aria-hidden="true"
                  />
                )}
                <span className="relative z-10">{opt.short}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div
      role="group"
      aria-label={t.language.label}
      className="inline-flex items-center p-0.5 h-9 rounded-md bg-slate-100 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shrink-0"
    >
      {options.map((opt) => {
        const active = locale === opt.code;
        return (
          <button
            key={opt.code}
            type="button"
            onClick={() => setLocale(opt.code)}
            aria-pressed={active}
            aria-label={opt.aria}
            className={`relative h-full px-2.5 text-xs font-mono font-semibold rounded transition-colors ${
              active
                ? 'text-accent dark:text-slate-50'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            {active && (
              <motion.span
                layoutId={layoutGroup}
                transition={{ type: 'spring', stiffness: 480, damping: 34 }}
                className="absolute inset-0 rounded bg-white dark:bg-slate-700 shadow-xs"
                aria-hidden="true"
              />
            )}
            <span className="relative z-10">{opt.short}</span>
          </button>
        );
      })}
    </div>
  );
}
