import mongoose, { Schema, type InferSchemaType } from 'mongoose';
import type { Book } from '../../../shared/library';

const bookSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 180 },
    author: { type: String, required: true, trim: true, maxlength: 120 },
    genre: { type: String, required: true, trim: true, maxlength: 60, index: true },
    stock: { type: Number, required: true, min: 0, max: 10000, default: 1 },
    publishedYear: { type: Number, required: false },
    isbn: { type: String, required: false, trim: true, maxlength: 40 },
    coverImage: { type: String, required: false, trim: true, maxlength: 450000 },
    description: { type: String, required: false, trim: true, maxlength: 1200 },
    publisher: { type: String, required: false, trim: true, maxlength: 120 },
    pages: { type: Number, required: false, min: 1, max: 20000 },
    shelfLocation: { type: String, required: false, trim: true, maxlength: 60 },
    language: { type: String, required: false, trim: true, maxlength: 40 },
  },
  {
    timestamps: true,
    collection: 'books',
  }
);

bookSchema.index({ title: 1 });
bookSchema.index({ stock: 1 });

export const BookModel =
  (mongoose.models.Book as mongoose.Model<InferSchemaType<typeof bookSchema>>) ||
  mongoose.model('Book', bookSchema);

export function toBookDTO(doc: {
  _id: unknown;
  title: string;
  author: string;
  genre: string;
  stock: number;
  publishedYear?: number | null;
  isbn?: string | null;
  coverImage?: string | null;
  description?: string | null;
  publisher?: string | null;
  pages?: number | null;
  shelfLocation?: string | null;
  language?: string | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}): Book {
  return {
    id: String(doc._id),
    title: doc.title,
    author: doc.author,
    genre: doc.genre,
    stock: doc.stock,
    publishedYear: doc.publishedYear ?? undefined,
    isbn: doc.isbn ?? undefined,
    coverImage: doc.coverImage ?? undefined,
    description: doc.description ?? undefined,
    publisher: doc.publisher ?? undefined,
    pages: doc.pages ?? undefined,
    shelfLocation: doc.shelfLocation ?? undefined,
    language: doc.language ?? undefined,
    createdAt: doc.createdAt
      ? new Date(doc.createdAt).toISOString()
      : new Date().toISOString(),
    updatedAt: doc.updatedAt
      ? new Date(doc.updatedAt).toISOString()
      : new Date().toISOString(),
  };
}
