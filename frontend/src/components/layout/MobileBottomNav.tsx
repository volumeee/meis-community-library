import { useState } from 'react';
import { Plus, type LucideIcon } from 'lucide-react';
import { motion } from 'motion/react';
import { MEI_AVATAR_URL } from '../../config/assets';
import { WORKSPACE_NAV_ITEMS, type WorkspaceView } from '../../config/navigation';
import { useI18n } from '../../store/useLocaleStore';
interface MobileBottomNavProps {
  activeView: WorkspaceView;
  onSelectView: (view: WorkspaceView) => void;
  draftItemCount: number;
  activeLoansCount: number;
  librarianName: string;
  onOpenAddBook: () => void;
  onOpenAccount: () => void;
}

export function MobileBottomNav({
  activeView,
  onSelectView,
  draftItemCount,
  activeLoansCount,
  librarianName,
  onOpenAddBook,
  onOpenAccount,
}: MobileBottomNavProps) {
  const { t } = useI18n();
  const [avatarFailed, setAvatarFailed] = useState(false);

  const librarianInitials =
    librarianName
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('') || 'ML';

  const navLabels: Record<WorkspaceView, string> = {
    catalog: t.nav.catalogShort,
    lend: t.nav.lendShort,
    history: t.nav.historyShort,
  };
  const navBadges: Record<WorkspaceView, number | undefined> = {
    catalog: undefined,
    lend: draftItemCount > 0 ? draftItemCount : undefined,
    history: activeLoansCount > 0 ? activeLoansCount : undefined,
  };
  const navTabs: Array<{
    id: WorkspaceView;
    label: string;
    icon: LucideIcon;
    badge?: number;
  }> = WORKSPACE_NAV_ITEMS.map((item) => ({
    ...item,
    label: navLabels[item.id],
    badge: navBadges[item.id],
  }));

  const renderTab = (tab: (typeof navTabs)[number]) => {
    const Icon = tab.icon;
    const isActive = activeView === tab.id;

    return (
      <button
        key={tab.id}
        type="button"
        onClick={() => onSelectView(tab.id)}
        aria-current={isActive ? 'page' : undefined}
        className={`relative flex flex-col items-center justify-end gap-1 h-[64px] pb-[7px] px-0.5 transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent dark:focus-visible:outline-blue-400 ${
          isActive
            ? 'text-accent dark:text-blue-400'
            : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
        }`}
      >
        {isActive && (
          <motion.span
            layoutId="mobile-tab-indicator"
            transition={{ type: 'spring', stiffness: 450, damping: 35 }}
            className="absolute top-0 inset-x-0 mx-auto w-7 h-[2.5px] rounded-b-full bg-accent dark:bg-blue-400"
            aria-hidden="true"
          />
        )}
        <span className="relative inline-flex h-6 w-6 items-center justify-center">
          <Icon className="h-5 w-5" aria-hidden="true" />
          {tab.badge !== undefined && (
            <motion.span
              key={`${tab.id}-${tab.badge}`}
              initial={{ scale: 0.7 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 24 }}
              className={`absolute -top-1 -right-2.5 min-w-[17px] h-[17px] px-1 rounded-full font-mono text-[10px] font-semibold tabular-nums flex items-center justify-center ${
                tab.id === 'lend'
                  ? 'bg-accent dark:bg-blue-500 text-white'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-100'
              }`}
            >
              {tab.badge}
            </motion.span>
          )}
        </span>

        <span className="max-w-full truncate text-[10px] sm:text-[11px] font-medium tracking-tight leading-tight">
          {tab.label}
        </span>
      </button>
    );
  };

  const notchContour =
    'M 0 0.5 L 11.29 0.5 A 12 12 0 0 1 22.71 8.80 A 35 35 0 0 0 89.29 8.80 A 12 12 0 0 1 100.71 0.5 L 112 0.5';

  return (
    <nav
      aria-label={t.nav.mobileNavigation}
      className="lg:hidden fixed bottom-0 inset-x-0 z-30"
    >
      <div className="relative pb-safe">
        {/* Curved bar backdrop: fixed-width tangent-arc notch stays distortion-free at all widths */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 flex flex-col drop-shadow-[0_-4px_14px_rgba(15,23,42,0.06)] dark:drop-shadow-[0_-4px_18px_rgba(0,0,0,0.45)]"
        >
          <div className="flex h-[64px] w-full shrink-0">
            <div className="flex-1 -mr-px bg-white dark:bg-surface-dark border-t border-slate-200 dark:border-slate-800" />
            <svg
              width="112"
              height="64"
              viewBox="0 0 112 64"
              fill="none"
              className="shrink-0 block"
            >
              <path
                d={`${notchContour} L 112 64 L 0 64 Z`}
                className="fill-white dark:fill-surface-dark"
              />
              <path
                d={notchContour}
                strokeWidth="1"
                className="stroke-slate-200 dark:stroke-slate-800"
              />
            </svg>
            <div className="flex-1 -ml-px bg-white dark:bg-surface-dark border-t border-slate-200 dark:border-slate-800" />
          </div>
          <div className="flex-1 -mt-px bg-white dark:bg-surface-dark" />
        </div>

        <div className="relative z-10 grid grid-cols-5 h-[64px]">
          {renderTab(navTabs[0])}
          {renderTab(navTabs[1])}

          <motion.button
            type="button"
            whileTap={{ scale: 0.93 }}
            onClick={onOpenAddBook}
            aria-label={t.nav.addBook}
            title={t.nav.addBook}
            className="group relative flex flex-col items-center justify-end h-[64px] pb-[7px] px-0.5 text-accent dark:text-blue-400 hover:text-accent-hover dark:hover:text-blue-300 transition-colors focus-visible:outline-none"
          >
            <span className="absolute -top-[30px] left-1/2 -translate-x-1/2 inline-flex h-14 w-14 items-center justify-center">
              <span
                aria-hidden="true"
                className="fab-add-halo pointer-events-none absolute inset-0 rounded-full bg-[#2563eb]/30 dark:bg-sky-400/30"
              />
              <span className="relative inline-flex h-14 w-14 items-center justify-center rounded-full overflow-hidden text-white ring-1 ring-white/25 dark:ring-sky-300/30 shadow-[0_8px_20px_-4px_rgba(30,58,95,0.5)] dark:shadow-[0_8px_22px_-4px_rgba(37,99,235,0.55)] group-focus-visible:ring-2 group-focus-visible:ring-accent dark:group-focus-visible:ring-blue-400 group-focus-visible:ring-offset-2 group-focus-visible:ring-offset-white dark:group-focus-visible:ring-offset-surface-dark">
                <span
                  aria-hidden="true"
                  className="fab-add-aurora absolute -inset-3 rounded-full"
                />
                <span
                  aria-hidden="true"
                  className="absolute inset-0 bg-[radial-gradient(circle_at_30%_25%,rgba(255,255,255,0.24),transparent_62%)]"
                />
                <span
                  aria-hidden="true"
                  className="fab-add-sheen absolute inset-y-[-30%] -left-1/2 w-1/2"
                />
                <Plus
                  className="relative z-10 h-6 w-6 stroke-[2.4] drop-shadow-[0_1px_1px_rgba(15,23,42,0.3)]"
                  aria-hidden="true"
                />
              </span>
            </span>
            <span className="max-w-full truncate text-[10px] sm:text-[11px] font-semibold tracking-tight leading-tight">
              {t.nav.addShort}
            </span>
          </motion.button>

          {renderTab(navTabs[2])}

          <button
            type="button"
            onClick={onOpenAccount}
            aria-label={t.accountPassword.openProfileAria}
            title={t.accountPassword.profileHint}
            className="flex flex-col items-center justify-end gap-1 h-[64px] pb-[7px] px-0.5 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent dark:focus-visible:outline-blue-400"
          >
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 dark:border-slate-700 overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0">
              {!avatarFailed ? (
                <img
                  src={MEI_AVATAR_URL}
                  alt=""
                  referrerPolicy="no-referrer"
                  onError={() => setAvatarFailed(true)}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="font-display text-[10px] font-semibold text-slate-700 dark:text-slate-200">
                  {librarianInitials}
                </span>
              )}
            </span>
            <span className="max-w-full truncate text-[10px] sm:text-[11px] font-medium tracking-tight leading-tight">
              {t.nav.profileShort}
            </span>
          </button>
        </div>
      </div>
    </nav>
  );
}
