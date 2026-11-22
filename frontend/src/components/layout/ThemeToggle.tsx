import { Moon, Sun } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import type { ThemeMode } from '../../hooks/useTheme';
import { useI18n } from '../../store/useLocaleStore';

interface ThemeToggleProps {
  theme: ThemeMode;
  onToggle: () => void;
  variant?: 'icon' | 'sidebar';
}

export function ThemeToggle({ theme, onToggle, variant = 'icon' }: ThemeToggleProps) {
  const { t } = useI18n();
  const isDark = theme === 'dark';
  const ariaLabel = isDark ? t.theme.switchToLight : t.theme.switchToDark;

  const iconNode = (
    <span className="relative inline-flex h-4 w-4 items-center justify-center shrink-0">
      <AnimatePresence mode="wait" initial={false}>
        {isDark ? (
          <motion.span
            key="sun"
            initial={{ rotate: -90, opacity: 0, scale: 0.7 }}
            animate={{ rotate: 0, opacity: 1, scale: 1 }}
            exit={{ rotate: 90, opacity: 0, scale: 0.7 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="inline-flex"
          >
            <Sun className="h-4 w-4 text-amber-400" aria-hidden="true" />
          </motion.span>
        ) : (
          <motion.span
            key="moon"
            initial={{ rotate: 90, opacity: 0, scale: 0.7 }}
            animate={{ rotate: 0, opacity: 1, scale: 1 }}
            exit={{ rotate: -90, opacity: 0, scale: 0.7 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="inline-flex"
          >
            <Moon className="h-4 w-4 text-slate-600" aria-hidden="true" />
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );

  if (variant === 'sidebar') {
    return (
      <motion.button
        type="button"
        whileTap={{ scale: 0.97 }}
        onClick={onToggle}
        aria-label={ariaLabel}
        className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-md text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100/80 dark:bg-slate-800/70 hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent dark:focus-visible:outline-blue-400"
      >
        <span className="flex items-center gap-2.5">
          {iconNode}
          <span>{isDark ? t.theme.lightMode : t.theme.darkMode}</span>
        </span>
        <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
          {isDark ? t.theme.darkShort : t.theme.lightShort}
        </span>
      </motion.button>
    );
  }

  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.92 }}
      onClick={onToggle}
      aria-label={ariaLabel}
      className="inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent dark:focus-visible:outline-blue-400"
    >
      {iconNode}
    </motion.button>
  );
}
