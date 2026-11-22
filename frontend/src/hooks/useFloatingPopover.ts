import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from 'react';

const FOCUSABLE_SELECTOR =
  'button:not(:disabled):not([tabindex="-1"]), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])';

interface UseFloatingPopoverOptions<TPosition> {
  isOpen: boolean;
  disabled?: boolean;
  onClose: () => void;
  triggerRef: RefObject<HTMLElement | null>;
  popoverRef: RefObject<HTMLElement | null>;
  computePosition: (trigger: HTMLElement) => TPosition;
  closeOnOutsideFocus?: boolean;
  trapTab?: boolean;
}

export function useFloatingPopover<TPosition>({
  isOpen,
  disabled = false,
  onClose,
  triggerRef,
  popoverRef,
  computePosition,
  closeOnOutsideFocus = false,
  trapTab = false,
}: UseFloatingPopoverOptions<TPosition>): {
  position: TPosition | null;
  updatePosition: () => void;
} {
  const [position, setPosition] = useState<TPosition | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    setPosition(computePosition(trigger));
  }, [computePosition, triggerRef]);

  useEffect(() => {
    if (disabled) onCloseRef.current();
  }, [disabled]);

  useLayoutEffect(() => {
    if (!isOpen) return;
    updatePosition();
  }, [isOpen, updatePosition]);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || popoverRef.current?.contains(target)) {
        return;
      }
      onCloseRef.current();
    };

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        onCloseRef.current();
        triggerRef.current?.focus();
        return;
      }
      if (trapTab && event.key === 'Tab') {
        const popover = popoverRef.current;
        if (!popover) return;
        const focusables = Array.from(
          popover.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
        ).filter((el) => el.offsetParent !== null);
        if (focusables.length === 0) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const active = document.activeElement as HTMLElement | null;
        event.stopPropagation();
        if (event.shiftKey) {
          if (!active || active === first || !popover.contains(active)) {
            event.preventDefault();
            last.focus();
          }
        } else if (!active || active === last || !popover.contains(active)) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    const handleFocusIn = (event: FocusEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (triggerRef.current?.contains(target) || popoverRef.current?.contains(target)) {
        return;
      }
      onCloseRef.current();
    };

    const handleViewportChange = () => updatePosition();

    document.addEventListener('mousedown', handlePointerDown);
    if (closeOnOutsideFocus) {
      document.addEventListener('focusin', handleFocusIn);
    }
    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('scroll', handleViewportChange, true);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      if (closeOnOutsideFocus) {
        document.removeEventListener('focusin', handleFocusIn);
      }
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('scroll', handleViewportChange, true);
    };
  }, [isOpen, updatePosition, triggerRef, popoverRef, closeOnOutsideFocus, trapTab]);

  return { position, updatePosition };
}
