import { useI18n } from '../../store/useLocaleStore';
import type { BookDetailValues } from './useBookForm';

interface BookDetailFieldsProps {
  inputBase: string;
  disabled?: boolean;
  fieldErrors: Record<string, string>;
  values: BookDetailValues;
  onChange: <K extends keyof BookDetailValues>(field: K, value: string) => void;
}

export function BookDetailFields({
  inputBase,
  disabled = false,
  fieldErrors,
  values,
  onChange,
}: BookDetailFieldsProps) {
  const { t } = useI18n();

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="book-year-input"
            className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
          >
            {t.bookForm.publishedYear}
          </label>
          <input
            id="book-year-input"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={4}
            disabled={disabled}
            value={values.yearInput}
            onChange={(e) =>
              onChange('yearInput', e.target.value.replace(/[^\d]/g, '').slice(0, 4))
            }
            aria-invalid={Boolean(fieldErrors.publishedYear)}
            aria-describedby={fieldErrors.publishedYear ? 'book-year-error' : undefined}
            placeholder={t.bookForm.publishedYearPlaceholder}
            className={`${inputBase} font-mono tabular-nums`}
          />
          {fieldErrors.publishedYear && (
            <p
              id="book-year-error"
              className="mt-1 text-xs text-red-700 dark:text-red-400"
            >
              {fieldErrors.publishedYear}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="book-isbn-input"
            className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
          >
            {t.bookForm.isbn}
          </label>
          <input
            id="book-isbn-input"
            type="text"
            disabled={disabled}
            value={values.isbn}
            onChange={(e) => onChange('isbn', e.target.value)}
            aria-invalid={Boolean(fieldErrors.isbn)}
            aria-describedby={fieldErrors.isbn ? 'book-isbn-error' : undefined}
            placeholder={t.bookForm.isbnPlaceholder}
            className={`${inputBase} font-mono`}
          />
          {fieldErrors.isbn && (
            <p
              id="book-isbn-error"
              className="mt-1 text-xs text-red-700 dark:text-red-400"
            >
              {fieldErrors.isbn}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="book-publisher-input"
            className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
          >
            {t.bookForm.publisher}
          </label>
          <input
            id="book-publisher-input"
            type="text"
            disabled={disabled}
            value={values.publisher}
            onChange={(e) => onChange('publisher', e.target.value)}
            aria-invalid={Boolean(fieldErrors.publisher)}
            aria-describedby={fieldErrors.publisher ? 'book-publisher-error' : undefined}
            placeholder={t.bookForm.publisherPlaceholder}
            className={inputBase}
          />
          {fieldErrors.publisher && (
            <p
              id="book-publisher-error"
              className="mt-1 text-xs text-red-700 dark:text-red-400"
            >
              {fieldErrors.publisher}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="book-pages-input"
            className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
          >
            {t.bookForm.pages}
          </label>
          <input
            id="book-pages-input"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={5}
            disabled={disabled}
            value={values.pagesInput}
            onChange={(e) =>
              onChange('pagesInput', e.target.value.replace(/[^\d]/g, '').slice(0, 5))
            }
            aria-invalid={Boolean(fieldErrors.pages)}
            aria-describedby={fieldErrors.pages ? 'book-pages-error' : undefined}
            placeholder={t.bookForm.pagesPlaceholder}
            className={`${inputBase} font-mono tabular-nums`}
          />
          {fieldErrors.pages && (
            <p
              id="book-pages-error"
              className="mt-1 text-xs text-red-700 dark:text-red-400"
            >
              {fieldErrors.pages}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="book-shelf-input"
            className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
          >
            {t.bookForm.shelfLocation}
          </label>
          <input
            id="book-shelf-input"
            type="text"
            disabled={disabled}
            value={values.shelfLocation}
            onChange={(e) => onChange('shelfLocation', e.target.value)}
            aria-invalid={Boolean(fieldErrors.shelfLocation)}
            aria-describedby={fieldErrors.shelfLocation ? 'book-shelf-error' : undefined}
            placeholder={t.bookForm.shelfLocationPlaceholder}
            className={inputBase}
          />
          {fieldErrors.shelfLocation && (
            <p
              id="book-shelf-error"
              className="mt-1 text-xs text-red-700 dark:text-red-400"
            >
              {fieldErrors.shelfLocation}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="book-language-input"
            className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
          >
            {t.bookForm.language}
          </label>
          <input
            id="book-language-input"
            type="text"
            disabled={disabled}
            value={values.language}
            onChange={(e) => onChange('language', e.target.value)}
            aria-invalid={Boolean(fieldErrors.language)}
            aria-describedby={fieldErrors.language ? 'book-language-error' : undefined}
            placeholder={t.bookForm.languagePlaceholder}
            className={inputBase}
          />
          {fieldErrors.language && (
            <p
              id="book-language-error"
              className="mt-1 text-xs text-red-700 dark:text-red-400"
            >
              {fieldErrors.language}
            </p>
          )}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label
            htmlFor="book-description-input"
            className="block text-xs font-medium text-slate-700 dark:text-slate-300"
          >
            {t.bookForm.synopsis}
          </label>
          <span className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
            {values.description.length}/1200
          </span>
        </div>
        <textarea
          id="book-description-input"
          rows={3}
          maxLength={1200}
          disabled={disabled}
          value={values.description}
          onChange={(e) => onChange('description', e.target.value)}
          aria-invalid={Boolean(fieldErrors.description)}
          aria-describedby={
            fieldErrors.description ? 'book-description-error' : undefined
          }
          placeholder={t.bookForm.synopsisPlaceholder}
          className="w-full px-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-accent dark:focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-accent/15 dark:focus:ring-blue-500/20 disabled:opacity-60 disabled:cursor-not-allowed resize-y"
        />
        {fieldErrors.description && (
          <p
            id="book-description-error"
            className="mt-1 text-xs text-red-700 dark:text-red-400"
          >
            {fieldErrors.description}
          </p>
        )}
      </div>
    </>
  );
}
