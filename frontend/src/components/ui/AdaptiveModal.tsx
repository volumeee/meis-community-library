import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { motion, useIsPresent } from 'motion/react';
interface AdaptiveModalProps {
  ariaLabelledBy: string;
  maxWidthClass?: string;
  onClose: () => void;
  children: ReactNode;
}

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

const modalStack: { panel: HTMLElement; previousFocus: HTMLElement | null }[] = [];
let originalOverflow = '';
let originalRootInert: boolean | null = null;

function getVisibleFocusables(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (el) => {
      if (
        el.hasAttribute('disabled') ||
        el.hidden ||
        el.getAttribute('aria-hidden') === 'true' ||
        el.classList.contains('sr-only') ||
        el.offsetParent === null ||
        el.closest('[hidden], [inert]')
      ) {
        return false;
      }
      if (
        typeof window !== 'undefined' &&
        window.getComputedStyle(el).visibility === 'hidden'
      ) {
        return false;
      }
      const rect = el.getBoundingClientRect();
      return rect.width > 1 || rect.height > 1;
    }
  );
}

export function AdaptiveModal({
  ariaLabelledBy,
  maxWidthClass = 'sm:max-w-lg',
  onClose,
  children,
}: AdaptiveModalProps) {
  const isPresent = useIsPresent();
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isPresent) return;
    const panel = panelRef.current;
    if (!panel) return;
    const dialog = panel.parentElement ?? panel;
    const entry = { panel, previousFocus: document.activeElement as HTMLElement | null };
    if (modalStack.length === 0) {
      originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      const appRoot = document.getElementById('root');
      if (appRoot) {
        originalRootInert = appRoot.inert;
        appRoot.inert = true;
      }
    }
    modalStack.push(entry);
    const initialFocusables = getVisibleFocusables(panel);
    const autoFocusTarget = initialFocusables.find(
      (el) => el.dataset.autofocus === 'true'
    );
    if (autoFocusTarget) {
      autoFocusTarget.focus();
    } else if (initialFocusables.length > 0) {
      initialFocusables[0].focus();
    } else {
      panel.focus();
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (modalStack[modalStack.length - 1] !== entry || event.defaultPrevented) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
        return;
      }

      if (event.key === 'Tab') {
        const focusables = getVisibleFocusables(dialog);
        if (focusables.length === 0) {
          event.preventDefault();
          panel.focus();
          return;
        }

        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const active = document.activeElement as HTMLElement | null;

        if (event.shiftKey) {
          if (!active || active === first || !dialog.contains(active)) {
            event.preventDefault();
            last.focus();
          }
        } else if (!active || active === last || !dialog.contains(active)) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      const index = modalStack.indexOf(entry);
      const wasTop = index === modalStack.length - 1;
      if (index >= 0) modalStack.splice(index, 1);
      for (const remaining of modalStack) {
        if (remaining.previousFocus && dialog.contains(remaining.previousFocus)) {
          remaining.previousFocus = entry.previousFocus;
        }
      }
      if (modalStack.length === 0) {
        document.body.style.overflow = originalOverflow;
        const appRoot = document.getElementById('root');
        if (appRoot && originalRootInert !== null) {
          appRoot.inert = originalRootInert;
          originalRootInert = null;
        }
      }
      if (wasTop) {
        const top = modalStack[modalStack.length - 1];
        if (
          entry.previousFocus?.isConnected &&
          (!top || (top.panel.parentElement ?? top.panel).contains(entry.previousFocus))
        ) {
          entry.previousFocus.focus();
        } else if (top) {
          top.panel.focus();
        }
      }
    };
  }, [isPresent]);

  const modal = (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
      className={`fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-slate-950/55 dark:bg-black/70 backdrop-blur-[2px] ${
        !isPresent ? 'pointer-events-none' : ''
      }`}
      role="dialog"
      aria-modal="true"
      aria-labelledby={ariaLabelledBy}
      onMouseDown={(e) => {
        if (isPresent && e.button === 0 && e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <motion.div
        ref={panelRef}
        tabIndex={-1}
        initial={{ opacity: 0, y: 36, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 24, scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 400, damping: 34, mass: 0.9 }}
        className={`w-full ${maxWidthClass} max-h-[92dvh] sm:max-h-[88dvh] flex flex-col bg-white dark:bg-surface-dark border-t sm:border border-slate-200 dark:border-slate-800 rounded-t-2xl sm:rounded-xl shadow-xl overflow-hidden outline-none pb-safe sm:pb-0 ${
          !isPresent ? 'pointer-events-none' : ''
        }`}
      >
        {/* Mobile bottom-sheet grab handle */}
        <div
          aria-hidden="true"
          className="sm:hidden flex justify-center pt-2.5 pb-1 shrink-0"
        >
          <span className="h-1.5 w-10 rounded-full bg-slate-300 dark:bg-slate-700" />
        </div>
        {children}
      </motion.div>
    </motion.div>
  );

  return typeof document !== 'undefined' ? createPortal(modal, document.body) : modal;
}
