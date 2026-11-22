import { useState } from 'react';
import { BookOpen, KeyRound, LogOut, type LucideIcon } from 'lucide-react';
import { motion } from 'motion/react';
import { MEI_AVATAR_URL } from '../../config/assets';
import { WORKSPACE_NAV_ITEMS, type WorkspaceView } from '../../config/navigation';
import type { ThemeMode } from '../../hooks/useTheme';
import { useI18n } from '../../store/useLocaleStore';
import { LanguageToggle } from './LanguageToggle';
import { ThemeToggle } from './ThemeToggle';
interface SidebarProps {
  activeView: WorkspaceView;
  onSelectView: (view: WorkspaceView) => void;
  totalBooks: number;
  draftItemCount: number;
  activeLoansCount: number;
  theme: ThemeMode;
  onToggleTheme: () => void;
  librarianName: string;
  onOpenAccount: () => void;
  onSignOut: () => void;
}

export function Sidebar({
  activeView,
  onSelectView,
  totalBooks,
  draftItemCount,
  activeLoansCount,
  theme,
  onToggleTheme,
  librarianName,
  onOpenAccount,
  onSignOut,
}: SidebarProps) {
  const { t } = useI18n();
  const [avatarFailed, setAvatarFailed] = useState(false);

  const navLabels: Record<WorkspaceView, string> = {
    catalog: t.nav.catalog,
    lend: t.nav.lend,
    history: t.nav.history,
  };
  const navCounts: Record<WorkspaceView, number | undefined> = {
    catalog: totalBooks,
    lend: draftItemCount > 0 ? draftItemCount : undefined,
    history: activeLoansCount,
  };
  const navItems: Array<{
    id: WorkspaceView;
    label: string;
    icon: LucideIcon;
    count?: number;
    popKey?: string;
  }> = WORKSPACE_NAV_ITEMS.map((item) => ({
    ...item,
    label: navLabels[item.id],
    count: navCounts[item.id],
    popKey: item.id === 'lend' ? `draft-${draftItemCount}` : undefined,
  }));

  return (
    <aside className="hidden lg:block lg:w-[248px] lg:shrink-0">
      <div className="sticky top-0 h-screen flex flex-col bg-white dark:bg-surface-dark border-r border-slate-200 dark:border-slate-800">
        <div className="flex h-16 items-center px-6 gap-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent dark:bg-blue-600 text-white shadow-sm shrink-0">
            <BookOpen className="h-4.5 w-4.5" aria-hidden="true" />
          </div>
          <span className="font-display text-lg font-bold tracking-tight text-slate-900 dark:text-slate-50 whitespace-nowrap shrink-0">
            {t.meta.brandShort}
          </span>
        </div>

        <nav aria-label={t.nav.libraryNavigation} className="flex-1 px-3 py-5 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectView(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`relative w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-md text-sm font-medium whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent dark:focus-visible:outline-blue-400 ${
                  isActive
                    ? 'text-white'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-slate-50'
                }`}
              >
                {isActive && (
                  <motion.span
                    layoutId="desktop-nav-indicator"
                    transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                    className="absolute inset-0 rounded-md bg-accent dark:bg-blue-600"
                    aria-hidden="true"
                  />
                )}
                <span className="relative z-10 flex items-center gap-2.5 min-w-0">
                  <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span className="truncate">{item.label}</span>
                </span>
                {item.count !== undefined && (
                  <motion.span
                    key={item.popKey ?? `${item.id}-${item.count}`}
                    initial={item.id === 'lend' ? { scale: 0.75 } : false}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 24 }}
                    className={`relative z-10 font-mono text-xs tabular-nums ${
                      isActive
                        ? 'text-slate-200 dark:text-blue-100'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {item.count}
                  </motion.span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="border-t border-slate-200 dark:border-slate-800 p-4 space-y-2.5">
          <LanguageToggle variant="sidebar" layoutGroup="sidebar-lang" />
          <ThemeToggle theme={theme} onToggle={onToggleTheme} variant="sidebar" />

          <div className="flex items-center gap-2 pt-1.5">
            <button
              type="button"
              onClick={onOpenAccount}
              aria-label={t.accountPassword.openProfileAria}
              title={t.accountPassword.profileHint}
              className="group flex items-center gap-3 min-w-0 flex-1 rounded-md p-1.5 -m-1.5 text-left hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent dark:focus-visible:outline-blue-400"
            >
              {!avatarFailed ? (
                <img
                  src={MEI_AVATAR_URL}
                  alt={`${librarianName}, ${t.meta.headLibrarian}`}
                  referrerPolicy="no-referrer"
                  onError={() => setAvatarFailed(true)}
                  className="h-10 w-10 rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                />
              ) : (
                <div
                  aria-hidden="true"
                  className="h-10 w-10 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-display text-sm font-semibold flex items-center justify-center shrink-0"
                >
                  {librarianName
                    .split(/\s+/)
                    .slice(0, 2)
                    .map((p) => p[0]?.toUpperCase() ?? '')
                    .join('') || 'ML'}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                  {librarianName}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate flex items-center gap-1">
                  <span className="truncate">{t.meta.headLibrarian}</span>
                  <KeyRound
                    className="h-3 w-3 shrink-0 opacity-50 group-hover:opacity-100 transition-opacity"
                    aria-hidden="true"
                  />
                </p>
              </div>
            </button>
            <button
              type="button"
              onClick={onSignOut}
              aria-label={t.nav.signOut}
              title={t.nav.signOut}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent dark:focus-visible:outline-blue-400"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
