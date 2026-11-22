import type { ChangeEvent, RefObject } from 'react';
import { ImagePlus, Trash2 } from 'lucide-react';
import { useI18n } from '../../store/useLocaleStore';
import { BookCover } from './BookCover';

interface BookCoverFieldsProps {
  coverImage: string;
  coverUrlInput: string;
  title: string;
  author: string;
  resolvedGenre: string;
  isProcessingPhoto: boolean;
  disabled?: boolean;
  photoError: string | null;
  fieldErrors: Record<string, string>;
  fileInputRef: RefObject<HTMLInputElement | null>;
  handlePhotoFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  handleCoverUrlChange: (value: string) => void;
  handleRemovePhoto: () => void;
}

export function BookCoverFields({
  coverImage,
  coverUrlInput,
  title,
  author,
  resolvedGenre,
  isProcessingPhoto,
  disabled = false,
  photoError,
  fieldErrors,
  fileInputRef,
  handlePhotoFileChange,
  handleCoverUrlChange,
  handleRemovePhoto,
}: BookCoverFieldsProps) {
  const { t } = useI18n();

  return (
    <div className="p-3.5 rounded-lg bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
      <div className="flex flex-col sm:flex-row gap-4 items-center sm:items-start">
        <BookCover
          src={coverImage}
          title={title || t.bookForm.defaultCoverTitle}
          author={author}
          genre={resolvedGenre}
          size="md"
        />

        <div className="flex-1 min-w-0 w-full space-y-2.5">
          <div>
            <p className="text-xs font-medium text-slate-800 dark:text-slate-200">
              {t.bookForm.coverPhotoLabel}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {t.bookForm.coverPhotoHint}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileInputRef}
              id="book-cover-file-input"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={disabled || isProcessingPhoto}
              onChange={handlePhotoFileChange}
              className="hidden"
            />
            <button
              type="button"
              disabled={disabled || isProcessingPhoto}
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 min-h-[38px] px-3 py-1.5 text-xs font-medium text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 whitespace-nowrap"
            >
              <ImagePlus className="h-3.5 w-3.5" aria-hidden="true" />
              <span>
                {isProcessingPhoto
                  ? t.bookForm.processingPhoto
                  : coverImage
                    ? t.bookForm.replacePhoto
                    : t.bookForm.uploadPhoto}
              </span>
            </button>

            {(coverImage || isProcessingPhoto) && (
              <button
                type="button"
                disabled={disabled}
                onClick={handleRemovePhoto}
                className="inline-flex items-center gap-1 min-h-[38px] px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-red-700 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-md disabled:opacity-40 whitespace-nowrap"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{t.bookForm.removePhoto}</span>
              </button>
            )}
          </div>

          <div>
            <label htmlFor="book-cover-url-input" className="sr-only">
              {t.bookForm.coverUrlAria}
            </label>
            <input
              id="book-cover-url-input"
              type="url"
              disabled={disabled}
              value={coverUrlInput}
              onChange={(e) => handleCoverUrlChange(e.target.value)}
              aria-invalid={Boolean(fieldErrors.coverImage || photoError)}
              aria-describedby={
                fieldErrors.coverImage || photoError ? 'book-cover-error' : undefined
              }
              placeholder={t.bookForm.coverUrlPlaceholder}
              className="w-full h-9 px-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-accent dark:focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-accent/15 dark:focus:ring-blue-500/20 disabled:opacity-60 disabled:cursor-not-allowed"
            />
            {coverImage.startsWith('data:') && !coverUrlInput && (
              <p className="mt-1 text-[11px] text-emerald-700 dark:text-emerald-400">
                {t.bookForm.uploadedPhotoReady}
              </p>
            )}
            {coverImage.startsWith('/src/assets/') && !coverUrlInput && (
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                {t.bookForm.currentPhotoActive}
              </p>
            )}
            {(photoError || fieldErrors.coverImage) && (
              <p
                id="book-cover-error"
                className="mt-1 text-xs text-red-700 dark:text-red-400"
              >
                {photoError || fieldErrors.coverImage}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
