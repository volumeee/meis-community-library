import mongoose, { Schema, type InferSchemaType } from 'mongoose';

const loginAttemptSchema = new Schema(
  {
    _id: { type: String, required: true },
    count: { type: Number, required: true },
    resetAt: { type: Date, required: true },
  },
  { collection: 'auth_login_attempts', versionKey: false }
);

loginAttemptSchema.index({ resetAt: 1 }, { expireAfterSeconds: 0 });

export const LoginAttemptModel =
  (mongoose.models.LoginAttempt as mongoose.Model<
    InferSchemaType<typeof loginAttemptSchema>
  >) || mongoose.model('LoginAttempt', loginAttemptSchema);
