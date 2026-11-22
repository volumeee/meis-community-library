import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, Search } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useFloatingPopover } from '../../hooks/useFloatingPopover';

export interface SelectOption {
  value: string;
  label: string;
  hint?: string;
  dividerBefore?: boolean;
  disabled?: boolean;
}

interface CustomSelectProps {
  id?: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  ariaLabel?: string;
  ariaInvalid?: boolean;
  ariaDescribedBy?: string;
  size?: 'sm' | 'md';
  searchable?: boolean;
  searchPlaceholder?: string;
  emptyText?: string;
  className?: string;
  minMenuWidth?: number;
}

interface PopoverPosition {
  top?: number;
  bottom?: number;
  left: number;
  width: number;
  openUp: boolean;
}

export function CustomSelect({
  id,
  value,
  options,
  onChange,
  disabled = false,
  placeholder = 'Select...',
  ariaLabel,
  ariaInvalid,
  ariaDescribedBy,
  size = 'md',
  searchable = false,
  searchPlaceholder = 'Search...',
  emptyText = 'No options found',
  className = '',
  minMenuWidth = 180,
}: CustomSelectProps) {
  const generatedId = useId();
  const listboxId = `${generatedId}-listbox`;
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const selectedOption = useMemo(
    () => options.find((opt) => opt.value === value),
    [options, value]
  );

  const filteredOptions = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!searchable || !q) return options;
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(q) ||
        (opt.hint && opt.hint.toLowerCase().includes(q))
    );
  }, [options, searchable, searchTerm]);
  const activeOptionId =
    isOpen && highlightedIndex >= 0 && filteredOptions[highlightedIndex]
      ? `${listboxId}-option-${highlightedIndex}`
      : undefined;

  const computePosition = useCallback(
    (trigger: HTMLElement): PopoverPosition => {
      const rect = trigger.getBoundingClientRect();
      const viewportW = window.innerWidth;
      const viewportH = window.innerHeight;
      const estimatedMenuHeight = Math.min(280, Math.max(120, options.length * 40 + 48));
      const spaceBelow = viewportH - rect.bottom - 12;
      const spaceAbove = rect.top - 12;
      const openUp = spaceBelow < estimatedMenuHeight && spaceAbove > spaceBelow;
      const width = Math.min(viewportW - 16, Math.max(rect.width, minMenuWidth));
      const left = Math.max(8, Math.min(rect.left, viewportW - width - 8));
      const top = openUp ? undefined : rect.bottom + 6;
      const bottom = openUp ? viewportH - rect.top + 6 : undefined;
      return { top, bottom, left, width, openUp };
    },
    [minMenuWidth, options.length]
  );

  const { position } = useFloatingPopover({
    isOpen,
    disabled,
    onClose: () => setIsOpen(false),
    triggerRef,
    popoverRef: menuRef,
    computePosition,
  });

  useEffect(() => {
    if (isOpen) {
      const activeIdx = filteredOptions.findIndex(
        (o) => o.value === value && !o.disabled
      );
      setHighlightedIndex(
        activeIdx >= 0
          ? activeIdx
          : filteredOptions.findIndex((option) => !option.disabled)
      );
      if (searchable) {
        window.requestAnimationFrame(() => {
          searchInputRef.current?.focus();
        });
      }
    } else {
      setSearchTerm('');
    }
  }, [isOpen, searchable, value]);

  useEffect(() => {
    if (!isOpen) return;
    setHighlightedIndex((prev) => {
      if (prev >= 0 && prev < filteredOptions.length && !filteredOptions[prev].disabled)
        return prev;
      return filteredOptions.findIndex((option) => !option.disabled);
    });
  }, [filteredOptions, isOpen]);

  useEffect(() => {
    if (activeOptionId && position)
      document.getElementById(activeOptionId)?.scrollIntoView({ block: 'nearest' });
  }, [activeOptionId, position]);

  const selectOption = (opt: SelectOption) => {
    if (disabled || opt.disabled) return;
    onChange(opt.value);
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  const moveHighlight = (delta: number) => {
    if (filteredOptions.length === 0) return;
    let next = highlightedIndex < 0 ? (delta > 0 ? -1 : 0) : highlightedIndex;
    for (let step = 0; step < filteredOptions.length; step++) {
      next = (next + delta + filteredOptions.length) % filteredOptions.length;
      if (!filteredOptions[next].disabled) {
        setHighlightedIndex(next);
        return;
      }
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (disabled) return;
    if (!isOpen) {
      if (
        event.key === 'ArrowDown' ||
        event.key === 'ArrowUp' ||
        event.key === 'Enter' ||
        event.key === ' '
      ) {
        event.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      moveHighlight(1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      moveHighlight(-1);
    } else if (
      event.key === 'Home' &&
      !(event.currentTarget instanceof HTMLInputElement)
    ) {
      event.preventDefault();
      setHighlightedIndex(filteredOptions.findIndex((option) => !option.disabled));
    } else if (
      event.key === 'End' &&
      !(event.currentTarget instanceof HTMLInputElement)
    ) {
      event.preventDefault();
      setHighlightedIndex(
        filteredOptions.reduce(
          (last, option, index) => (option.disabled ? last : index),
          -1
        )
      );
    } else if (event.key === 'Enter' || (event.key === ' ' && !searchable)) {
      event.preventDefault();
      const target = filteredOptions[highlightedIndex];
      if (target) selectOption(target);
    } else if (event.key === 'Tab') {
      setIsOpen(false);
      if (event.currentTarget === searchInputRef.current) {
        triggerRef.current?.focus();
      }
    }
  };

  const heightClass = size === 'sm' ? 'h-10 text-xs px-2.5' : 'h-11 text-sm px-3';

  return (
    <div className={`relative ${className}`}>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        role={searchable ? undefined : 'combobox'}
        disabled={disabled}
        aria-label={
          ariaLabel ? `${ariaLabel}: ${selectedOption?.label ?? placeholder}` : undefined
        }
        aria-haspopup={searchable ? 'dialog' : 'listbox'}
        aria-expanded={isOpen}
        aria-controls={isOpen ? listboxId : undefined}
        aria-activedescendant={!searchable && isOpen ? activeOptionId : undefined}
        aria-invalid={ariaInvalid}
        aria-describedby={ariaDescribedBy}
        onClick={() => {
          if (!disabled) setIsOpen((prev) => !prev);
        }}
        onKeyDown={handleKeyDown}
        className={`w-full inline-flex items-center justify-between gap-2 bg-white dark:bg-surface-dark border rounded-md text-left text-slate-900 dark:text-slate-100 disabled:opacity-60 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/20 dark:focus-visible:ring-blue-500/25 ${heightClass} ${
          ariaInvalid
            ? 'border-red-400 dark:border-red-500'
            : isOpen
              ? 'border-accent dark:border-blue-500 ring-2 ring-accent/15 dark:ring-blue-500/20'
              : 'border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600'
        }`}
      >
        <span className="truncate font-normal">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          className={`h-4 w-4 text-slate-500 dark:text-slate-400 shrink-0 transition-transform duration-150 ${
            isOpen ? 'rotate-180 text-accent dark:text-blue-400' : ''
          }`}
          aria-hidden="true"
        />
      </button>

      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {isOpen && position && (
              <motion.div
                ref={menuRef}
                initial={{ opacity: 0, y: position.openUp ? 4 : -4, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: position.openUp ? 4 : -4, scale: 0.98 }}
                transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  position: 'fixed',
                  top: position.top,
                  bottom: position.bottom,
                  left: position.left,
                  width: position.width,
                }}
                className="z-[70] bg-white dark:bg-surface-dark border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl overflow-hidden"
              >
                {searchable && (
                  <div className="p-2 border-b border-slate-100 dark:border-slate-800">
                    <div className="relative">
                      <Search
                        className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500 dark:text-slate-400"
                        aria-hidden="true"
                      />
                      <input
                        ref={searchInputRef}
                        type="text"
                        role="combobox"
                        aria-label={searchPlaceholder}
                        aria-expanded={isOpen}
                        aria-controls={listboxId}
                        aria-activedescendant={activeOptionId}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={searchPlaceholder}
                        className="w-full h-9 pl-8 pr-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-accent dark:focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-accent/15 dark:focus:ring-blue-500/20"
                      />
                    </div>
                  </div>
                )}

                <ul
                  id={listboxId}
                  role="listbox"
                  aria-label={ariaLabel}
                  className={
                    filteredOptions.length === 0
                      ? 'sr-only'
                      : 'max-h-60 overflow-y-auto p-1'
                  }
                >
                  {filteredOptions.map((opt, idx) => {
                    const isSelected = opt.value === value;
                    const isHighlighted = idx === highlightedIndex;
                    return (
                      <li
                        key={opt.value}
                        id={`${listboxId}-option-${idx}`}
                        role="option"
                        aria-selected={isSelected}
                        aria-disabled={opt.disabled}
                        onMouseEnter={() => setHighlightedIndex(idx)}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => selectOption(opt)}
                        className={`${
                          opt.dividerBefore
                            ? 'mt-1 pt-1 border-t border-slate-100 dark:border-slate-800'
                            : ''
                        }`}
                      >
                        <div
                          className={`flex items-center justify-between gap-2 px-2.5 py-2 rounded-md text-sm cursor-pointer select-none transition-colors ${
                            opt.disabled
                              ? 'opacity-40 cursor-not-allowed'
                              : isSelected
                                ? 'bg-accent/10 dark:bg-blue-500/20 text-accent dark:text-blue-300 font-medium'
                                : isHighlighted
                                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100'
                                  : 'text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <div className="min-w-0">
                            <span className="block truncate text-xs sm:text-sm">
                              {opt.label}
                            </span>
                            {opt.hint && (
                              <span className="block text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                {opt.hint}
                              </span>
                            )}
                          </div>
                          {isSelected && (
                            <Check
                              className="h-4 w-4 text-accent dark:text-blue-400 shrink-0"
                              aria-hidden="true"
                            />
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
                {filteredOptions.length === 0 && (
                  <div
                    role="status"
                    className="px-3 py-4 text-center text-xs text-slate-500 dark:text-slate-400"
                  >
                    {emptyText}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>,
          triggerRef.current?.closest('[role="dialog"][aria-modal="true"]') ??
            document.body
        )}
    </div>
  );
}
