import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { createPortal } from 'react-dom';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useFloatingPopover } from '../../hooks/useFloatingPopover';
import { useLocalTodayIso } from '../../hooks/useLocalTodayIso';
import { useI18n } from '../../store/useLocaleStore';
import {
  addDaysToIso,
  buildCalendarMonthGrid,
  formatMonthYear,
  getWeekdayLabels,
  parseIsoDate,
  shiftMonth,
  toIsoDate,
} from '../../utils/calendarLogic';
import { formatShortDate } from '../../utils/libraryLogic';

interface CalendarDatePickerProps {
  id?: string;
  value: string; // YYYY-MM-DD
  onChange: (isoDate: string) => void;
  minDate?: string;
  placeholder?: string;
  ariaLabel?: string;
  ariaInvalid?: boolean;
  ariaDescribedBy?: string;
  disabled?: boolean;
}

interface PopoverCoords {
  top?: number;
  bottom?: number;
  left: number;
  openUp: boolean;
  maxHeight: number;
}

export function CalendarDatePicker({
  id,
  value,
  onChange,
  minDate,
  placeholder,
  ariaLabel,
  ariaInvalid,
  ariaDescribedBy,
  disabled = false,
}: CalendarDatePickerProps) {
  const { locale, t } = useI18n();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const pendingFocusIsoRef = useRef<string | null>(null);
  const todayIso = useLocalTodayIso();

  const initialParts = useMemo(
    () => parseIsoDate(value) ?? parseIsoDate(todayIso)!,
    [value, todayIso]
  );

  const [isOpen, setIsOpen] = useState(false);
  const [viewYear, setViewYear] = useState(initialParts.year);
  const [viewMonth, setViewMonth] = useState(initialParts.month);
  const [focusedIso, setFocusedIso] = useState(value || todayIso);

  const computeCoords = useCallback((trigger: HTMLElement): PopoverCoords => {
    const rect = trigger.getBoundingClientRect();
    const popoverWidth = Math.min(312, window.innerWidth - 16);
    const popoverHeight = 368;
    const spaceBelow = window.innerHeight - rect.bottom - 12;
    const spaceAbove = rect.top - 12;
    const openUp = spaceBelow < popoverHeight && spaceAbove > spaceBelow;
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - popoverWidth - 8));
    const top = openUp ? undefined : rect.bottom + 6;
    const bottom = openUp ? window.innerHeight - rect.top + 6 : undefined;
    const maxHeight = Math.max(180, openUp ? spaceAbove : spaceBelow);
    return { top, bottom, left, openUp, maxHeight };
  }, []);

  const { position: coords } = useFloatingPopover({
    isOpen,
    disabled,
    onClose: () => setIsOpen(false),
    triggerRef,
    popoverRef,
    computePosition: computeCoords,
    closeOnOutsideFocus: true,
    trapTab: true,
  });

  useEffect(() => {
    if (isOpen) {
      const initialIso =
        value && (!minDate || value >= minDate)
          ? value
          : minDate && todayIso < minDate
            ? minDate
            : todayIso;
      const target = parseIsoDate(initialIso) ?? parseIsoDate(todayIso)!;
      setViewYear(target.year);
      setViewMonth(target.month);
      setFocusedIso(initialIso);
    }
  }, [isOpen, value, todayIso, minDate]);

  useEffect(() => {
    if (!isOpen || !coords) return;
    const frame = window.requestAnimationFrame(() => {
      const popover = popoverRef.current;
      (
        popover?.querySelector<HTMLButtonElement>(
          '[data-calendar-day][tabindex="0"]:not(:disabled)'
        ) ??
        popover?.querySelector<HTMLButtonElement>(
          '[aria-pressed="true"]:not(:disabled)'
        ) ??
        popover?.querySelector<HTMLButtonElement>('[data-calendar-day]:not(:disabled)') ??
        popover?.querySelector<HTMLButtonElement>('button:not(:disabled)')
      )?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [isOpen, Boolean(coords)]);

  useEffect(() => {
    if (!isOpen || !pendingFocusIsoRef.current) return;
    const targetIso = pendingFocusIsoRef.current;
    pendingFocusIsoRef.current = null;
    popoverRef.current
      ?.querySelector<HTMLButtonElement>(
        `[data-calendar-day="${targetIso}"]:not(:disabled)`
      )
      ?.focus();
  }, [isOpen, viewYear, viewMonth, focusedIso]);

  const cells = useMemo(
    () => buildCalendarMonthGrid(viewYear, viewMonth, todayIso),
    [viewYear, viewMonth, todayIso]
  );

  const weekdays = useMemo(() => getWeekdayLabels(locale), [locale]);
  const monthLabel = useMemo(
    () => formatMonthYear(viewYear, viewMonth, locale),
    [viewYear, viewMonth, locale]
  );

  const handleSelectIso = (iso: string) => {
    if (minDate && iso < minDate) return;
    onChange(iso);
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  const MIN_CALENDAR_YEAR = 1900;
  const MAX_CALENDAR_YEAR = 9999;
  const canGoPrevMonth = viewYear > MIN_CALENDAR_YEAR || viewMonth > 0;
  const canGoNextMonth = viewYear < MAX_CALENDAR_YEAR || viewMonth < 11;

  const handleShiftMonth = (delta: number) => {
    const next = shiftMonth(viewYear, viewMonth, delta);
    if (next.year < MIN_CALENDAR_YEAR || next.year > MAX_CALENDAR_YEAR) return;
    setViewYear(next.year);
    setViewMonth(next.month);
  };

  const activeDayIso = useMemo(() => {
    const isEnabled = (iso: string) => !minDate || iso >= minDate;
    const enabledCells = cells.filter((c) => isEnabled(c.iso));
    if (enabledCells.length === 0) return null;
    if (focusedIso && enabledCells.some((c) => c.iso === focusedIso)) return focusedIso;
    if (value && enabledCells.some((c) => c.iso === value)) return value;
    if (enabledCells.some((c) => c.iso === todayIso)) return todayIso;
    return enabledCells.find((c) => c.inCurrentMonth)?.iso ?? enabledCells[0].iso;
  }, [cells, focusedIso, minDate, todayIso, value]);

  const handleDayKeyDown = (
    event: ReactKeyboardEvent<HTMLButtonElement>,
    iso: string
  ) => {
    let targetIso: string | null = null;
    if (event.key === 'ArrowLeft') {
      targetIso = addDaysToIso(iso, -1);
    } else if (event.key === 'ArrowRight') {
      targetIso = addDaysToIso(iso, 1);
    } else if (event.key === 'ArrowUp') {
      targetIso = addDaysToIso(iso, -7);
    } else if (event.key === 'ArrowDown') {
      targetIso = addDaysToIso(iso, 7);
    } else if (event.key === 'PageUp' || event.key === 'PageDown') {
      const parts = parseIsoDate(iso);
      if (parts) {
        const nextMonth = shiftMonth(
          parts.year,
          parts.month,
          event.key === 'PageUp' ? -1 : 1
        );
        const lastDay = new Date(nextMonth.year, nextMonth.month + 1, 0).getDate();
        targetIso = toIsoDate(
          nextMonth.year,
          nextMonth.month,
          Math.min(parts.day, lastDay)
        );
      }
    }
    if (!targetIso) return;
    event.preventDefault();
    if (minDate && targetIso < minDate) {
      targetIso = minDate;
    }
    const parts = parseIsoDate(targetIso);
    if (!parts || parts.year < MIN_CALENDAR_YEAR || parts.year > MAX_CALENDAR_YEAR) {
      return;
    }
    pendingFocusIsoRef.current = targetIso;
    setFocusedIso(targetIso);
    if (parts.year !== viewYear || parts.month !== viewMonth) {
      setViewYear(parts.year);
      setViewMonth(parts.month);
    }
  };
  const presets = [
    { label: t.calendar.preset7Days, iso: addDaysToIso(todayIso, 7) },
    { label: t.calendar.preset14Days, iso: addDaysToIso(todayIso, 14) },
    { label: t.calendar.preset30Days, iso: addDaysToIso(todayIso, 30) },
  ];

  const formattedDisplay = value
    ? formatShortDate(value, locale)
    : (placeholder ?? t.calendar.chooseDate);

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        id={id}
        type="button"
        disabled={disabled}
        aria-label={ariaLabel ? `${ariaLabel}: ${formattedDisplay}` : formattedDisplay}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-invalid={ariaInvalid}
        aria-describedby={ariaDescribedBy}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full h-11 px-3 inline-flex items-center justify-between gap-2 bg-white dark:bg-slate-900 border rounded-md text-sm text-left transition-colors disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/20 dark:focus-visible:ring-blue-500/25 ${
          ariaInvalid
            ? 'border-red-400 dark:border-red-500'
            : isOpen
              ? 'border-accent dark:border-blue-500 ring-2 ring-accent/15 dark:ring-blue-500/20'
              : 'border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600'
        }`}
      >
        <span
          className={`font-mono tabular-nums truncate ${
            value
              ? 'text-slate-900 dark:text-slate-100'
              : 'text-slate-500 dark:text-slate-400 font-sans'
          }`}
        >
          {formattedDisplay}
        </span>
        <CalendarIcon
          className={`h-4 w-4 shrink-0 transition-colors ${
            isOpen
              ? 'text-accent dark:text-blue-400'
              : 'text-slate-500 dark:text-slate-400'
          }`}
          aria-hidden="true"
        />
      </button>

      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {isOpen && coords && (
              <motion.div
                ref={popoverRef}
                role="dialog"
                aria-label={t.calendar.dialogLabel}
                initial={{ opacity: 0, y: coords.openUp ? 6 : -6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: coords.openUp ? 6 : -6, scale: 0.98 }}
                transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  position: 'fixed',
                  top: coords.top,
                  bottom: coords.bottom,
                  left: coords.left,
                  width: Math.min(312, window.innerWidth - 16),
                  maxHeight: coords.maxHeight,
                }}
                className="z-[70] overflow-y-auto bg-white dark:bg-surface-dark border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl p-3.5 space-y-3"
              >
                {/* Quick loan duration presets */}
                <div className="flex items-center gap-1.5">
                  {presets.map((preset) => {
                    const isActive = value === preset.iso;
                    const isDisabled = Boolean(minDate && preset.iso < minDate);
                    return (
                      <button
                        key={preset.label}
                        type="button"
                        disabled={isDisabled}
                        onClick={() => handleSelectIso(preset.iso)}
                        className={`flex-1 h-8 px-2 rounded-md text-xs font-medium transition-colors whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed ${
                          isActive
                            ? 'bg-accent dark:bg-blue-600 text-white'
                            : 'bg-slate-100 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 hover:bg-slate-200/80 dark:hover:bg-slate-700'
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>

                {/* Month Navigation Header */}
                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    disabled={!canGoPrevMonth}
                    onClick={() => handleShiftMonth(-1)}
                    aria-label={t.calendar.previousMonth}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-35 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <span
                    aria-live="polite"
                    className="font-display text-sm font-semibold text-slate-900 dark:text-slate-50"
                  >
                    {monthLabel}
                  </span>
                  <button
                    type="button"
                    disabled={!canGoNextMonth}
                    onClick={() => handleShiftMonth(1)}
                    aria-label={t.calendar.nextMonth}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-35 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>

                {/* Weekday Header */}
                <div className="grid grid-cols-7 gap-1 text-center">
                  {weekdays.map((wd) => (
                    <span
                      key={wd}
                      className="text-[11px] font-medium text-slate-500 dark:text-slate-400 py-1"
                    >
                      {wd}
                    </span>
                  ))}
                </div>

                {/* 42-Day Fixed Grid */}
                <div className="grid grid-cols-7 gap-1">
                  {cells.map((cell) => {
                    const isSelected = cell.iso === value;
                    const isDisabled = Boolean(minDate && cell.iso < minDate);

                    return (
                      <button
                        key={cell.iso}
                        type="button"
                        data-calendar-day={cell.iso}
                        tabIndex={!isDisabled && cell.iso === activeDayIso ? 0 : -1}
                        disabled={isDisabled}
                        onClick={() => handleSelectIso(cell.iso)}
                        onFocus={() => setFocusedIso(cell.iso)}
                        onKeyDown={(e) => handleDayKeyDown(e, cell.iso)}
                        aria-pressed={isSelected}
                        aria-label={formatShortDate(cell.iso, locale)}
                        className={`h-9 w-full rounded-md font-mono text-xs tabular-nums flex items-center justify-center transition-colors focus-visible:outline-2 focus-visible:outline-accent dark:focus-visible:outline-blue-400 ${
                          isSelected
                            ? 'bg-accent dark:bg-blue-600 text-white font-semibold'
                            : isDisabled
                              ? 'text-slate-300 dark:text-slate-700 cursor-not-allowed'
                              : cell.isToday
                                ? 'bg-slate-100 dark:bg-slate-800 text-accent dark:text-blue-400 font-semibold ring-1 ring-inset ring-accent/35 dark:ring-blue-400/40 hover:bg-slate-200/70 dark:hover:bg-slate-700'
                                : cell.inCurrentMonth
                                  ? 'text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100/70 dark:hover:bg-slate-800/60'
                        }`}
                      >
                        {cell.day}
                      </button>
                    );
                  })}
                </div>

                {/* Footer Shortcut */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                  <button
                    type="button"
                    onClick={() => handleSelectIso(todayIso)}
                    disabled={Boolean(minDate && todayIso < minDate)}
                    className="font-medium text-accent dark:text-blue-400 hover:underline disabled:opacity-40"
                  >
                    {t.calendar.today}
                  </button>
                  <span className="font-mono text-[11px] tabular-nums text-slate-500 dark:text-slate-400">
                    {value ? formatShortDate(value, locale) : '—'}
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>,
          triggerRef.current?.closest('[role="dialog"][aria-modal="true"]') ??
            document.body
        )}
    </div>
  );
}
