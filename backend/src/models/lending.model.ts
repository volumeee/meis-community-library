import mongoose, { Schema, type InferSchemaType } from 'mongoose';
import type { LendingStatus, LendingTransaction } from '../../../shared/library';

const lendingItemSchema = new Schema(
  {
    bookId: { type: String, required: true },
    bookTitle: { type: String, required: true },
    author: { type: String, required: true },
    genre: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const lendingSchema = new Schema(
  {
    referenceCode: { type: String, required: true, unique: true },
    borrowerName: { type: String, required: true, trim: true, maxlength: 120 },
    borrowerPhone: { type: String, required: true, trim: true, maxlength: 40 },
    dueDate: { type: String, required: true },
    lentAt: { type: Date, required: true, default: Date.now },
    returnedAt: { type: Date, default: null },
    status: { type: String, enum: ['Active', 'Returned'], default: 'Active' },
    items: { type: [lendingItemSchema], required: true },
    totalCopies: { type: Number, required: true, min: 1 },
  },
  {
    timestamps: true,
    collection: 'lendings',
  }
);

lendingSchema.index({ lentAt: -1 });
lendingSchema.index({ status: 1, 'items.bookId': 1 });

export const LendingModel =
  (mongoose.models.Lending as mongoose.Model<InferSchemaType<typeof lendingSchema>>) ||
  mongoose.model('Lending', lendingSchema);

export function toLendingDTO(doc: {
  _id: unknown;
  referenceCode: string;
  borrowerName: string;
  borrowerPhone: string;
  dueDate: string;
  lentAt: Date | string;
  returnedAt?: Date | string | null;
  status: string;
  items: Array<{
    bookId: string;
    bookTitle: string;
    author: string;
    genre: string;
    quantity: number;
  }>;
  totalCopies: number;
}): LendingTransaction {
  return {
    id: String(doc._id),
    referenceCode: doc.referenceCode,
    borrowerName: doc.borrowerName,
    borrowerPhone: doc.borrowerPhone,
    dueDate: doc.dueDate,
    lentAt: new Date(doc.lentAt).toISOString(),
    returnedAt: doc.returnedAt ? new Date(doc.returnedAt).toISOString() : null,
    status: (doc.status === 'Returned' ? 'Returned' : 'Active') as LendingStatus,
    items: doc.items.map((item) => ({
      bookId: String(item.bookId),
      bookTitle: item.bookTitle,
      author: item.author,
      genre: item.genre,
      quantity: item.quantity,
    })),
    totalCopies: doc.totalCopies,
  };
}
