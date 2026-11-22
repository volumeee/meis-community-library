import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { TRANSLATIONS } from '../i18n/translations';
import type { Book } from '@shared/library';
import {
  addDaysToIso,
  buildCalendarMonthGrid,
  formatMonthYear,
  getWeekdayLabels,
  parseIsoDate,
  shiftMonth,
  toIsoDate,
} from './calendarLogic';
import { formatShortDate, validateBookForm, validateLendingForm } from './libraryLogic';

function collectKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  const keys: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    const full = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      keys.push(...collectKeys(v as Record<string, unknown>, full));
    } else {
      keys.push(full);
    }
  }
  return keys.sort();
}

describe('calendarLogic pure helpers', () => {
  it('parses valid ISO dates and rejects invalid calendar dates', () => {
    assert.deepEqual(parseIsoDate('2026-04-19'), { year: 2026, month: 3, day: 19 });
    assert.deepEqual(parseIsoDate('2024-02-29'), { year: 2024, month: 1, day: 29 });
    assert.equal(parseIsoDate('2026-02-29'), null);
    assert.equal(parseIsoDate('2026-02-30'), null);
    assert.equal(parseIsoDate('not-a-date'), null);
  });

  it('builds a fixed 42-cell Monday-first month grid with accurate leap-year days', () => {
    // Feb 2024 started on Thursday (Mon=0..Thu=3 -> 3 leading days from Jan 29..31)
    const feb2024 = buildCalendarMonthGrid(2024, 1, '2024-02-14');
    assert.equal(feb2024.length, 42);
    assert.equal(feb2024[0].iso, '2024-01-29');
    assert.equal(feb2024[0].inCurrentMonth, false);
    assert.equal(feb2024[3].iso, '2024-02-01');
    assert.equal(feb2024[3].inCurrentMonth, true);
    assert.equal(feb2024.find((c) => c.iso === '2024-02-29')?.inCurrentMonth, true);
    assert.equal(feb2024.find((c) => c.iso === '2024-02-14')?.isToday, true);

    // Non-leap Feb 2026 has 28 days
    const feb2026 = buildCalendarMonthGrid(2026, 1, '2026-02-10');
    assert.equal(feb2026.length, 42);
    assert.equal(feb2026.filter((c) => c.inCurrentMonth).length, 28);
  });

  it('shifts months accurately across year boundaries', () => {
    assert.deepEqual(shiftMonth(2026, 11, 1), { year: 2027, month: 0 });
    assert.deepEqual(shiftMonth(2026, 0, -1), { year: 2025, month: 11 });
    assert.equal(addDaysToIso('2026-12-28', 7), '2027-01-04');
    assert.equal(toIsoDate(2026, 0, 5), '2026-01-05');
  });

  it('returns localized weekday and month labels for EN and ID', () => {
    assert.deepEqual(getWeekdayLabels('en'), [
      'Mon',
      'Tue',
      'Wed',
      'Thu',
      'Fri',
      'Sat',
      'Sun',
    ]);
    assert.deepEqual(getWeekdayLabels('id'), [
      'Sen',
      'Sel',
      'Rab',
      'Kam',
      'Jum',
      'Sab',
      'Min',
    ]);
    assert.match(formatMonthYear(2026, 7, 'en'), /August 2026/);
    assert.match(formatMonthYear(2026, 7, 'id'), /Agustus 2026/);
  });
});

describe('i18n translation parity & localized libraryLogic', () => {
  it('maintains 100% key parity between EN and ID dictionaries with non-empty strings', () => {
    const enKeys = collectKeys(TRANSLATIONS.en as unknown as Record<string, unknown>);
    const idKeys = collectKeys(TRANSLATIONS.id as unknown as Record<string, unknown>);
    assert.deepEqual(idKeys, enKeys);

    const checkNonEmpty = (obj: Record<string, unknown>, path: string) => {
      for (const [k, v] of Object.entries(obj)) {
        const next = `${path}.${k}`;
        if (typeof v === 'string') {
          assert.ok(v.trim().length > 0, `Empty translation string at ${next}`);
        } else if (v && typeof v === 'object') {
          checkNonEmpty(v as Record<string, unknown>, next);
        }
      }
    };
    checkNonEmpty(TRANSLATIONS.en as unknown as Record<string, unknown>, 'en');
    checkNonEmpty(TRANSLATIONS.id as unknown as Record<string, unknown>, 'id');
  });

  it('formats short dates and validation messages in Bahasa Indonesia and English', () => {
    const enDate = formatShortDate('2026-08-17', 'en');
    const idDate = formatShortDate('2026-08-17', 'id');
    assert.match(enDate, /Aug/);
    assert.match(idDate, /Agu/);

    const bookErrId = validateBookForm(
      {
        title: '',
        author: '',
        genre: '',
        stockInput: '-1',
        yearInput: '900',
      },
      'id'
    );
    assert.equal(bookErrId.title, TRANSLATIONS.id.validation.titleRequired);
    assert.equal(bookErrId.author, TRANSLATIONS.id.validation.authorRequired);
    assert.equal(bookErrId.stock, TRANSLATIONS.id.validation.stockInvalid);

    const sampleBook: Book = {
      id: 'b1',
      title: 'Laskar Pelangi',
      author: 'Andrea Hirata',
      genre: 'Fiction',
      stock: 2,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    const lendErrId = validateLendingForm(
      {
        borrowerName: 'A',
        borrowerPhone: '123',
        dueDate: '',
        items: [{ bookId: 'b1', quantity: 5 }],
      },
      [sampleBook],
      'id'
    );
    assert.equal(lendErrId.borrowerName, TRANSLATIONS.id.validation.borrowerNameShort);
    assert.equal(lendErrId.borrowerPhone, TRANSLATIONS.id.validation.phoneInvalid);
    assert.equal(lendErrId.dueDate, TRANSLATIONS.id.validation.dueDateInvalid);
    assert.equal(
      lendErrId.items,
      TRANSLATIONS.id.validation.itemQtyExceeds(2, 'Laskar Pelangi')
    );
  });
});
