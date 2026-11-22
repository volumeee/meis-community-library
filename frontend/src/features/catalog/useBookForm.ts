import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from 'react';
import { useIsPresent } from 'motion/react';
import { DEFAULT_GENRES, type Book, type CreateBookInput } from '@shared/library';
import type { SelectOption } from '../../components/ui/CustomSelect';
import { ApiClientError } from '../../services/api';
import { useI18n } from '../../store/useLocaleStore';
import { processCoverImageFile } from '../../utils/imageUpload';
import { validateBookForm } from '../../utils/libraryLogic';

export const CUSTOM_GENRE_VALUE = '__custom__';

export interface BookDetailValues {
  yearInput: string;
  isbn: string;
  publisher: string;
  pagesInput: string;
  shelfLocation: string;
  language: string;
  description: string;
}

export interface BookFormValues extends BookDetailValues {
  title: string;
  author: string;
  genreChoice: string;
  customGenre: string;
  stockInput: string;
  coverImage: string;
  coverUrlInput: string;
}

const ERROR_FIELD_KEY_MAP: Partial<Record<keyof BookFormValues, string>> = {
  yearInput: 'publishedYear',
  pagesInput: 'pages',
  stockInput: 'stock',
  genreChoice: 'genre',
  customGenre: 'genre',
  coverUrlInput: 'coverImage',
};

interface UseBookFormOptions {
  bookToEdit: Book | null;
  existingGenres: string[];
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (input: CreateBookInput) => Promise<void>;
}

export function useBookForm({
  bookToEdit,
  existingGenres,
  isSubmitting,
  onClose,
  onSubmit,
}: UseBookFormOptions) {
  const { locale, t } = useI18n();
  const isEditing = Boolean(bookToEdit);

  const genreOptions = useMemo(
    () =>
      Array.from(
        new Set([
          ...DEFAULT_GENRES,
          ...existingGenres,
          ...(bookToEdit?.genre ? [bookToEdit.genre] : []),
        ])
      ).sort((a, b) => a.localeCompare(b)),
    [bookToEdit?.genre, existingGenres]
  );

  const genreSelectOptions = useMemo<SelectOption[]>(
    () => [
      ...genreOptions.map((g) => ({ value: `genre:${g}`, label: g })),
      {
        value: CUSTOM_GENRE_VALUE,
        label: t.bookForm.customGenreOption,
        dividerBefore: true,
      },
    ],
    [genreOptions, t.bookForm.customGenreOption]
  );

  const [values, setValues] = useState<BookFormValues>(() => ({
    title: bookToEdit?.title ?? '',
    author: bookToEdit?.author ?? '',
    genreChoice: `genre:${bookToEdit?.genre ?? genreOptions[0] ?? 'Fiction'}`,
    customGenre: '',
    stockInput: bookToEdit ? String(bookToEdit.stock) : '3',
    yearInput: bookToEdit?.publishedYear ? String(bookToEdit.publishedYear) : '',
    isbn: bookToEdit?.isbn ?? '',
    publisher: bookToEdit?.publisher ?? '',
    pagesInput: bookToEdit?.pages ? String(bookToEdit.pages) : '',
    shelfLocation: bookToEdit?.shelfLocation ?? '',
    language: bookToEdit
      ? (bookToEdit.language ?? '')
      : locale === 'id'
        ? 'Bahasa Indonesia'
        : 'English',
    description: bookToEdit?.description ?? '',
    coverImage: bookToEdit?.coverImage ?? '',
    coverUrlInput:
      bookToEdit?.coverImage && /^https?:\/\//i.test(bookToEdit.coverImage)
        ? bookToEdit.coverImage
        : '',
  }));

  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [shakeCount, setShakeCount] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoRequestRef = useRef(0);
  const saveRequestRef = useRef(0);
  const submittingRef = useRef(false);
  const isPresent = useIsPresent();
  const presentRef = useRef(isPresent);
  presentRef.current = isPresent;

  useEffect(() => {
    return () => {
      saveRequestRef.current += 1;
      photoRequestRef.current += 1;
    };
  }, []);

  const resolvedGenre =
    values.genreChoice === CUSTOM_GENRE_VALUE
      ? values.customGenre.trim()
      : values.genreChoice.slice('genre:'.length);

  const clearFieldError = (key: string) => {
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const setField = <K extends keyof BookFormValues>(key: K, next: BookFormValues[K]) => {
    setValues((prev) => ({ ...prev, [key]: next }));
    clearFieldError(ERROR_FIELD_KEY_MAP[key] ?? key);
  };

  const focusFirstError = (errors: Record<string, string>) => {
    const idMap: Record<string, string> = {
      coverImage: 'book-cover-url-input',
      title: 'book-title-input',
      author: 'book-author-input',
      genre:
        values.genreChoice === CUSTOM_GENRE_VALUE
          ? 'book-custom-genre-input'
          : 'book-genre-select',
      stock: 'book-stock-input',
      publishedYear: 'book-year-input',
      isbn: 'book-isbn-input',
      publisher: 'book-publisher-input',
      pages: 'book-pages-input',
      shelfLocation: 'book-shelf-input',
      language: 'book-language-input',
      description: 'book-description-input',
    };
    const firstKey = Object.keys(errors)[0];
    if (firstKey && idMap[firstKey]) {
      document.getElementById(idMap[firstKey])?.focus();
    }
  };

  const handleClose = () => {
    if (isSubmitting || submittingRef.current) return;
    saveRequestRef.current += 1;
    photoRequestRef.current += 1;
    onClose();
  };

  const handlePhotoFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const inputEl = e.currentTarget;
    const file = inputEl.files?.[0];
    if (!file) return;
    const request = ++photoRequestRef.current;

    setPhotoError(null);
    clearFieldError('coverImage');

    setIsProcessingPhoto(true);
    try {
      const compressedDataUrl = await processCoverImageFile(file);
      if (request !== photoRequestRef.current || !presentRef.current) return;
      setValues((prev) => ({
        ...prev,
        coverImage: compressedDataUrl,
        coverUrlInput: '',
      }));
    } catch (error) {
      if (request !== photoRequestRef.current || !presentRef.current) return;
      setPhotoError(
        error instanceof Error ? error.message : t.bookForm.photoProcessError
      );
    } finally {
      if (request === photoRequestRef.current && presentRef.current) {
        inputEl.value = '';
        setIsProcessingPhoto(false);
      }
    }
  };

  const handleCoverUrlChange = (value: string) => {
    photoRequestRef.current += 1;
    setIsProcessingPhoto(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setPhotoError(null);
    clearFieldError('coverImage');
    setValues((prev) => ({
      ...prev,
      coverUrlInput: value,
      coverImage: value.trim(),
    }));
  };

  const handleRemovePhoto = () => {
    photoRequestRef.current += 1;
    setIsProcessingPhoto(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setPhotoError(null);
    clearFieldError('coverImage');
    setValues((prev) => ({ ...prev, coverImage: '', coverUrlInput: '' }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isSubmitting || isProcessingPhoto || submittingRef.current) return;
    setFormError(null);

    const errors = validateBookForm(
      {
        title: values.title,
        author: values.author,
        genre: resolvedGenre,
        stockInput: values.stockInput,
        yearInput: values.yearInput,
        pagesInput: values.pagesInput,
        isbn: values.isbn,
        publisher: values.publisher,
        shelfLocation: values.shelfLocation,
        language: values.language,
        description: values.description,
        coverImage: values.coverImage,
      },
      locale
    );

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setShakeCount((c) => c + 1);
      focusFirstError(errors);
      return;
    }

    setFieldErrors({});
    submittingRef.current = true;
    const request = ++saveRequestRef.current;
    try {
      await onSubmit({
        title: values.title.trim(),
        author: values.author.trim(),
        genre: resolvedGenre,
        stock: Number(values.stockInput.trim()),
        publishedYear: values.yearInput.trim()
          ? Number(values.yearInput.trim())
          : undefined,
        isbn: values.isbn.trim() || undefined,
        publisher: values.publisher.trim() || undefined,
        pages: values.pagesInput.trim() ? Number(values.pagesInput.trim()) : undefined,
        shelfLocation: values.shelfLocation.trim() || undefined,
        language: values.language.trim() || undefined,
        description: values.description.trim() || undefined,
        coverImage: values.coverImage.trim() || undefined,
      });
      if (request === saveRequestRef.current && presentRef.current) {
        saveRequestRef.current += 1;
        photoRequestRef.current += 1;
        onClose();
        return;
      }
      submittingRef.current = false;
    } catch (error) {
      submittingRef.current = false;
      if (request !== saveRequestRef.current || !presentRef.current) return;
      setShakeCount((c) => c + 1);
      if (error instanceof ApiClientError) {
        setFormError(error.message);
        if (error.fieldErrors) {
          setFieldErrors(error.fieldErrors);
          focusFirstError(error.fieldErrors);
        }
      } else {
        setFormError(t.bookForm.saveFailedFallback);
      }
    }
  };

  return {
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
  };
}
