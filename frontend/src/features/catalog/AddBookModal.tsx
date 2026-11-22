import { X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import type { Book, CreateBookInput } from '@shared/library';
import { AdaptiveModal } from '../../components/ui/AdaptiveModal';
import { CustomSelect } from '../../components/ui/CustomSelect';
import { FormAlert } from '../../components/ui/FormAlert';
import { NumberStepper } from '../../components/ui/NumberStepper';
import { useI18n } from '../../store/useLocaleStore';
import { BookCoverFields } from './BookCoverFields';
import { BookDetailFields } from './BookDetailFields';
import { CUSTOM_GENRE_VALUE, useBookForm } from './useBookForm';

interface AddBookModalProps {
  bookToEdit?: Book | null;
  existingGenres: string[];
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (input: CreateBookInput) => Promise<void>;
}

const INPUT_BASE =
  'w-full h-11 px-3 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-accent dark:focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-accent/15 dark:focus:ring-blue-500/20 disabled:opacity-60 disabled:cursor-not-allowed';

export function AddBookModal({
  bookToEdit = null,
  existingGenres,
  isSubmitting,
  onClose,
  onSubmit,
}: AddBookModalProps) {
  const { t } = useI18n();
  const {
    isEditing,
    values,
    setField,
    resolvedGenre,
    genreSelectOptions,
    isProcessingPhoto,
    photoError,
    fieldErrors,
    formError,
    shakeCount,
    fileInputRef,
    handleClose,
    handlePhotoFileChange,
    handleCoverUrlChange,
    handleRemovePhoto,
    handleSubmit,
  } = useBookForm({
    bookToEdit,
    existingGenres,
    isSubmitting,
    onClose,
    onSubmit,
  });

  const modalTitle = isEditing ? t.bookForm.editTitle : t.bookForm.addTitle;
  const modalSubtitle = isEditing ? t.bookForm.editSubtitle : t.bookForm.addSubtitle;

  return (
    <AdaptiveModal
      ariaLabelledBy="book-form-title"
      maxWidthClass="sm:max-w-xl"
      onClose={handleClose}
    >
      <div className="flex items-center justify-between px-5 sm:px-6 py-3.5 sm:py-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
        <div>
          <h2
            id="book-form-title"
            className="font-display text-lg font-semibold text-slate-900 dark:text-slate-50"
          >
            {modalTitle}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {modalSubtitle}
          </p>
        </div>
        <button
          type="button"
          disabled={isSubmitting}
          onClick={handleClose}
          aria-label={t.bookForm.closeAria(modalTitle)}
          className="inline-flex h-11 w-11 -mr-2 items-center justify-center rounded-md text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <form onSubmit={handleSubmit} noValidate className="flex flex-col flex-1 min-h-0">
        <motion.div
          animate={{
            x:
              shakeCount === 0
                ? 0
                : shakeCount % 2
                  ? [-4, 4, -2, 2, 0]
                  : [4, -4, 2, -2, 0],
          }}
          transition={{ duration: 0.22 }}
          className="flex-1 overflow-y-auto px-5 sm:px-6 py-5 space-y-4"
        >
          {formError && <FormAlert className="text-sm">{formError}</FormAlert>}

          <BookCoverFields
            coverImage={values.coverImage}
            coverUrlInput={values.coverUrlInput}
            title={values.title}
            author={values.author}
            resolvedGenre={resolvedGenre}
            isProcessingPhoto={isProcessingPhoto}
            disabled={isSubmitting}
            photoError={photoError}
            fieldErrors={fieldErrors}
            fileInputRef={fileInputRef}
            handlePhotoFileChange={handlePhotoFileChange}
            handleCoverUrlChange={handleCoverUrlChange}
            handleRemovePhoto={handleRemovePhoto}
          />

          <div>
            <label
              htmlFor="book-title-input"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
            >
              {t.bookForm.bookTitle}{' '}
              <span className="text-red-600 dark:text-red-400">*</span>
            </label>
            <input
              id="book-title-input"
              type="text"
              data-autofocus="true"
              disabled={isSubmitting}
              value={values.title}
              onChange={(e) => setField('title', e.target.value)}
              aria-invalid={Boolean(fieldErrors.title)}
              aria-describedby={fieldErrors.title ? 'book-title-error' : undefined}
              placeholder={t.bookForm.bookTitlePlaceholder}
              className={INPUT_BASE}
            />
            {fieldErrors.title && (
              <p
                id="book-title-error"
                className="mt-1 text-xs text-red-700 dark:text-red-400"
              >
                {fieldErrors.title}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="book-author-input"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
            >
              {t.bookForm.author}{' '}
              <span className="text-red-600 dark:text-red-400">*</span>
            </label>
            <input
              id="book-author-input"
              type="text"
              disabled={isSubmitting}
              value={values.author}
              onChange={(e) => setField('author', e.target.value)}
              aria-invalid={Boolean(fieldErrors.author)}
              aria-describedby={fieldErrors.author ? 'book-author-error' : undefined}
              placeholder={t.bookForm.authorPlaceholder}
              className={INPUT_BASE}
            />
            {fieldErrors.author && (
              <p
                id="book-author-error"
                className="mt-1 text-xs text-red-700 dark:text-red-400"
              >
                {fieldErrors.author}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="book-genre-select"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                {t.bookForm.genre}{' '}
                <span className="text-red-600 dark:text-red-400">*</span>
              </label>
              <CustomSelect
                id="book-genre-select"
                value={values.genreChoice}
                options={genreSelectOptions}
                disabled={isSubmitting}
                onChange={(next) => setField('genreChoice', next)}
                ariaLabel={t.bookForm.genre}
                ariaInvalid={Boolean(fieldErrors.genre)}
                ariaDescribedBy={fieldErrors.genre ? 'book-genre-error' : undefined}
                minMenuWidth={220}
              />
              <AnimatePresence>
                {values.genreChoice === CUSTOM_GENRE_VALUE && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <input
                      id="book-custom-genre-input"
                      type="text"
                      disabled={isSubmitting}
                      aria-label={t.bookForm.customGenreAria}
                      aria-invalid={Boolean(fieldErrors.genre)}
                      aria-describedby={
                        fieldErrors.genre ? 'book-genre-error' : undefined
                      }
                      value={values.customGenre}
                      onChange={(e) => setField('customGenre', e.target.value)}
                      placeholder={t.bookForm.customGenrePlaceholder}
                      className={`mt-2 ${INPUT_BASE}`}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
              {fieldErrors.genre && (
                <p
                  id="book-genre-error"
                  className="mt-1 text-xs text-red-700 dark:text-red-400"
                >
                  {fieldErrors.genre}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="book-stock-input"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                {t.bookForm.copiesOnShelf}{' '}
                <span className="text-red-600 dark:text-red-400">*</span>
              </label>
              <NumberStepper
                id="book-stock-input"
                value={values.stockInput}
                disabled={isSubmitting}
                onChange={(next) => setField('stockInput', next)}
                min={0}
                max={10000}
                decreaseLabel={t.bookForm.decreaseStockAria}
                increaseLabel={t.bookForm.increaseStockAria}
                ariaInvalid={Boolean(fieldErrors.stock)}
                ariaDescribedBy={fieldErrors.stock ? 'book-stock-error' : undefined}
              />
              {fieldErrors.stock && (
                <p
                  id="book-stock-error"
                  className="mt-1 text-xs text-red-700 dark:text-red-400"
                >
                  {fieldErrors.stock}
                </p>
              )}
            </div>
          </div>

          <BookDetailFields
            inputBase={INPUT_BASE}
            disabled={isSubmitting}
            fieldErrors={fieldErrors}
            values={values}
            onChange={setField}
          />
        </motion.div>

        <div className="flex items-center justify-end gap-3 px-5 sm:px-6 py-4 bg-slate-50/80 dark:bg-slate-900/70 border-t border-slate-200 dark:border-slate-800 shrink-0">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleClose}
            className="min-h-[44px] px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 whitespace-nowrap"
          >
            {t.bookForm.cancel}
          </button>
          <motion.button
            type="submit"
            whileTap={{ scale: 0.97 }}
            disabled={isSubmitting || isProcessingPhoto}
            className="min-h-[44px] px-5 py-2 text-sm font-medium text-white bg-accent dark:bg-blue-600 rounded-md hover:bg-accent-hover dark:hover:bg-blue-500 disabled:opacity-50 whitespace-nowrap"
          >
            {isSubmitting
              ? t.bookForm.saving
              : isEditing
                ? t.bookForm.saveChanges
                : t.bookForm.saveBook}
          </motion.button>
        </div>
      </form>
    </AdaptiveModal>
  );
}
