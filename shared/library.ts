export type SortField = 'title' | 'stock';
export type SortOrder = 'asc' | 'desc';
export type LendingStatus = 'Active' | 'Returned';

export const DEFAULT_GENRES = [
  'Fiction',
  'Non-Fiction',
  'Science',
  'History',
  'Mystery',
  'Fantasy',
  'Biography',
  'Technology',
  'Philosophy',
  'Children',
] as const;

export interface Book {
  id: string;
  title: string;
  author: string;
  genre: string;
  stock: number;
  publishedYear?: number;
  isbn?: string;
  coverImage?: string;
  description?: string;
  publisher?: string;
  pages?: number;
  shelfLocation?: string;
  language?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBookInput {
  title: string;
  author: string;
  genre: string;
  stock: number;
  publishedYear?: number;
  isbn?: string;
  coverImage?: string;
  description?: string;
  publisher?: string;
  pages?: number;
  shelfLocation?: string;
  language?: string;
}

export type UpdateBookInput = Omit<CreateBookInput, 'stock'> & {
  stock?: number;
  expectedStock?: number;
};

export interface BookQuery {
  genre?: string;
  sortBy?: SortField;
  sortOrder?: SortOrder;
  search?: string;
}

export interface LendingItemInput {
  bookId: string;
  quantity: number;
}

export interface LendingItem {
  bookId: string;
  bookTitle: string;
  author: string;
  genre: string;
  quantity: number;
}

export interface LendingPreviewItem extends LendingItem {
  availableStock: number;
  remainingStock: number;
}

export interface LendingPreview {
  borrowerName: string;
  borrowerPhone: string;
  dueDate: string;
  items: LendingPreviewItem[];
  totalTitles: number;
  totalCopies: number;
}

export interface CreateLendingInput {
  borrowerName: string;
  borrowerPhone: string;
  dueDate: string;
  items: LendingItemInput[];
}

export interface LendingTransaction {
  id: string;
  referenceCode: string;
  borrowerName: string;
  borrowerPhone: string;
  dueDate: string;
  lentAt: string;
  returnedAt: string | null;
  status: LendingStatus;
  items: LendingItem[];
  totalCopies: number;
}

export interface ApiErrorResponse {
  error: string;
  fieldErrors?: Record<string, string>;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'admin';
  canChangePassword?: boolean;
}

export interface AuthStatusResponse {
  databaseConnected: boolean;
  databaseError?: string;
  needsSetup: boolean;
  requiresSetupToken?: boolean;
  hasSessionCookie?: boolean;
  defaultProfile: {
    name: string;
    email: string;
  };
}

export interface AuthSessionResponse {
  user: AuthUser;
  accessToken: string;
  expiresInSeconds: number;
}

const LOCAL_ASSET_IMAGE_REGEX =
  /^\/src\/assets\/images\/[A-Za-z0-9_-]+\.(jpg|jpeg|png|webp)$/i;
const RASTER_DATA_URL_REGEX = /^data:image\/(jpeg|jpg|png|webp);base64,[A-Za-z0-9+/=]+$/i;
export const MAX_COVER_DATA_URL_LENGTH = 450_000;

export function isSafeCoverImageUrl(raw: string): boolean {
  const value = raw.trim();
  if (!value) return true;
  if (LOCAL_ASSET_IMAGE_REGEX.test(value)) return value.length <= 256;
  if (RASTER_DATA_URL_REGEX.test(value)) {
    return value.length <= MAX_COVER_DATA_URL_LENGTH;
  }
  try {
    const parsed = new URL(value);
    if (parsed.username || parsed.password) return false;
    return (
      (parsed.protocol === 'https:' || parsed.protocol === 'http:') &&
      value.length <= 2048
    );
  } catch {
    return false;
  }
}
