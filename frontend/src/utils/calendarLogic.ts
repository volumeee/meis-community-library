import type { Locale } from '../i18n/translations';

export interface CalendarDateParts {
  year: number;
  month: number; // 0-indexed (0 = Jan, 11 = Dec)
  day: number;
}

export interface CalendarCell {
  iso: string;
  day: number;
  inCurrentMonth: boolean;
  isToday: boolean;
}

const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function parseIsoDate(iso: string): CalendarDateParts | null {
  const match = ISO_DATE_RE.exec(iso.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const probe = new Date(year, month, day);
  if (
    probe.getFullYear() !== year ||
    probe.getMonth() !== month ||
    probe.getDate() !== day
  ) {
    return null;
  }
  return { year, month, day };
}

export function toIsoDate(year: number, month: number, day: number): string {
  const d = new Date(year, month, day);
  const yyyy = String(d.getFullYear()).padStart(4, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function getLocalTodayIso(now = new Date()): string {
  return toIsoDate(now.getFullYear(), now.getMonth(), now.getDate());
}

export function addDaysToIso(baseIso: string, days: number): string {
  const parts = parseIsoDate(baseIso);
  if (!parts) return baseIso;
  return toIsoDate(parts.year, parts.month, parts.day + days);
}

export function shiftMonth(
  year: number,
  month: number,
  delta: number
): { year: number; month: number } {
  const d = new Date(year, month + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() };
}

/**
 * Builds a fixed 6-row × 7-column (42-cell) calendar grid starting on Monday.
 * Fixed 42 cells prevent popover height jumping as users navigate months.
 */
export function buildCalendarMonthGrid(
  year: number,
  month: number,
  todayIso = getLocalTodayIso()
): CalendarCell[] {
  const firstDayOfMonth = new Date(year, month, 1);
  // Convert JS Sunday=0..Saturday=6 into Monday=0..Sunday=6
  const startOffset = (firstDayOfMonth.getDay() + 6) % 7;
  const cells: CalendarCell[] = [];

  for (let idx = 0; idx < 42; idx++) {
    const dayNumber = idx - startOffset + 1;
    const cellDate = new Date(year, month, dayNumber);
    const cellIso = toIsoDate(
      cellDate.getFullYear(),
      cellDate.getMonth(),
      cellDate.getDate()
    );
    cells.push({
      iso: cellIso,
      day: cellDate.getDate(),
      inCurrentMonth: cellDate.getFullYear() === year && cellDate.getMonth() === month,
      isToday: cellIso === todayIso,
    });
  }

  return cells;
}

const WEEKDAYS_EN = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const WEEKDAYS_ID = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

export function getWeekdayLabels(locale: Locale): string[] {
  return locale === 'id' ? WEEKDAYS_ID : WEEKDAYS_EN;
}

export function formatMonthYear(year: number, month: number, locale: Locale): string {
  const date = new Date(year, month, 1);
  return date.toLocaleDateString(locale === 'id' ? 'id-ID' : 'en-US', {
    month: 'long',
    year: 'numeric',
  });
}
