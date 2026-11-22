import mongoose, { Schema, type InferSchemaType } from 'mongoose';

const refreshTokenSchema = new Schema(
  {
    tokenHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    familyId: { type: String, required: false },
    sessionExpiresAt: { type: Date, required: false },
  },
  { _id: false }
);

const consumedRefreshTokenSchema = new Schema(
  {
    tokenHash: { type: String, required: true },
    familyId: { type: String, required: true },
    rotatedAt: { type: Date, required: true },
  },
  { _id: false }
);

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 160,
    },
    role: { type: String, enum: ['admin'], default: 'admin', required: true },
    passwordHash: { type: String, required: true },
    tokenVersion: { type: Number, default: 0, required: true },
    refreshTokens: { type: [refreshTokenSchema], default: [] },
    consumedRefreshTokens: { type: [consumedRefreshTokenSchema], default: [] },
  },
  {
    timestamps: true,
    collection: 'users',
  }
);

userSchema.index({ 'refreshTokens.tokenHash': 1 });
userSchema.index({ 'consumedRefreshTokens.tokenHash': 1 });

export const UserModel =
  (mongoose.models.User as mongoose.Model<InferSchemaType<typeof userSchema>>) ||
  mongoose.model('User', userSchema);
