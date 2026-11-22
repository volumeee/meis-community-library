import mongoose from 'mongoose';
import { LoginAttemptModel } from '../../models/login-attempt.model';
import { UserModel } from '../../models/user.model';
import {
  CONSUMED_TOKEN_RETENTION_MS,
  MAX_ACTIVE_SESSIONS,
  MAX_CONSUMED_REFRESH_TOKENS,
  type IAuthRepository,
  type StoredRefreshToken,
  type StoredUser,
} from './auth.repository.interface';

const FIRST_USER_ID = new mongoose.Types.ObjectId('000000000000000000000001');

function toStoredUser(doc: {
  _id: unknown;
  name: string;
  email: string;
  role: string;
  passwordHash: string;
  tokenVersion?: number;
  refreshTokens?: Array<{
    tokenHash: string;
    expiresAt: Date | string;
    familyId?: string | null;
    sessionExpiresAt?: Date | string | null;
  }>;
  consumedRefreshTokens?: Array<{
    tokenHash: string;
    familyId: string;
    rotatedAt: Date | string;
  }>;
  createdAt?: Date | string;
}): StoredUser {
  return {
    id: String(doc._id),
    name: doc.name,
    email: doc.email.toLowerCase(),
    role: 'admin',
    passwordHash: doc.passwordHash,
    tokenVersion:
      typeof doc.tokenVersion === 'number' && Number.isInteger(doc.tokenVersion)
        ? doc.tokenVersion
        : 0,
    refreshTokens: (doc.refreshTokens ?? []).map((t) => ({
      tokenHash: t.tokenHash,
      expiresAt: new Date(t.expiresAt).toISOString(),
      ...(t.familyId ? { familyId: t.familyId } : {}),
      ...(t.sessionExpiresAt
        ? { sessionExpiresAt: new Date(t.sessionExpiresAt).toISOString() }
        : {}),
    })),
    consumedRefreshTokens: (doc.consumedRefreshTokens ?? []).map((c) => ({
      tokenHash: c.tokenHash,
      familyId: c.familyId,
      rotatedAt: new Date(c.rotatedAt).toISOString(),
    })),
    createdAt: doc.createdAt
      ? new Date(doc.createdAt).toISOString()
      : new Date().toISOString(),
  };
}

function toRefreshTokenDoc(token: StoredRefreshToken): Record<string, unknown> {
  const entry: Record<string, unknown> = {
    tokenHash: token.tokenHash,
    expiresAt: new Date(token.expiresAt),
  };
  if (token.familyId) entry.familyId = token.familyId;
  if (token.sessionExpiresAt) {
    entry.sessionExpiresAt = new Date(token.sessionExpiresAt);
  }
  return entry;
}

function tokenVersionFilter(expectedTokenVersion: number): Record<string, unknown> {
  if (expectedTokenVersion === 0) {
    return {
      $or: [
        { tokenVersion: 0 },
        { tokenVersion: { $exists: false } },
        { tokenVersion: null },
      ],
    };
  }
  return { tokenVersion: expectedTokenVersion };
}

export class MongoAuthRepository implements IAuthRepository {
  async consumeLoginAttempt(clientKey: string, windowMs: number): Promise<number> {
    const now = new Date();
    const expired = { $lte: [{ $ifNull: ['$resetAt', new Date(0)] }, now] };
    const attempts = LoginAttemptModel.db.collection<{
      _id: string;
      count: number;
      resetAt: Date;
    }>(LoginAttemptModel.collection.name);
    const record = await attempts.findOneAndUpdate(
      { _id: clientKey },
      [
        {
          $set: {
            count: { $cond: [expired, 1, { $add: ['$count', 1] }] },
            resetAt: { $cond: [expired, new Date(now.getTime() + windowMs), '$resetAt'] },
          },
        },
      ],
      { upsert: true, returnDocument: 'after' }
    );
    if (!record) throw new Error('Unable to record login attempt.');
    return record.count;
  }

  async clearLoginAttempts(clientKey: string): Promise<void> {
    await LoginAttemptModel.deleteOne({ _id: clientKey });
  }

  async countUsers(): Promise<number> {
    return UserModel.countDocuments();
  }

  async findUserByEmail(email: string): Promise<StoredUser | null> {
    const normalized = email.trim().toLowerCase();
    const doc = await UserModel.findOne({ email: { $eq: normalized } }).lean();
    return doc ? toStoredUser(doc) : null;
  }

  async findUserById(id: string): Promise<StoredUser | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    const doc = await UserModel.findById(id).lean();
    return doc ? toStoredUser(doc) : null;
  }

  async createFirstUserAtomic(input: {
    name: string;
    email: string;
    passwordHash: string;
  }): Promise<StoredUser | null> {
    if ((await UserModel.countDocuments()) > 0) return null;
    try {
      const created = await UserModel.create({
        _id: FIRST_USER_ID,
        name: input.name,
        email: input.email.trim().toLowerCase(),
        role: 'admin',
        passwordHash: input.passwordHash,
        tokenVersion: 0,
        refreshTokens: [],
        consumedRefreshTokens: [],
      });
      return toStoredUser(created.toObject());
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 11000
      ) {
        return null;
      }
      throw error;
    }
  }

  async addRefreshToken(
    userId: string,
    expectedTokenVersion: number,
    token: StoredRefreshToken
  ): Promise<boolean> {
    if (!mongoose.Types.ObjectId.isValid(userId)) return false;
    const now = new Date();
    const newEntry = toRefreshTokenDoc(token);
    const result = await UserModel.updateOne(
      { _id: userId, ...tokenVersionFilter(expectedTokenVersion) },
      [
        {
          $set: {
            tokenVersion: { $ifNull: ['$tokenVersion', 0] },
            refreshTokens: {
              $slice: [
                {
                  $concatArrays: [
                    {
                      $filter: {
                        input: { $ifNull: ['$refreshTokens', []] },
                        as: 't',
                        cond: {
                          $and: [
                            { $gt: ['$$t.expiresAt', now] },
                            {
                              $or: [
                                {
                                  $eq: [
                                    { $ifNull: ['$$t.sessionExpiresAt', null] },
                                    null,
                                  ],
                                },
                                { $gt: ['$$t.sessionExpiresAt', now] },
                              ],
                            },
                          ],
                        },
                      },
                    },
                    [newEntry],
                  ],
                },
                -MAX_ACTIVE_SESSIONS,
              ],
            },
          },
        },
      ],
      { updatePipeline: true }
    );
    return result.modifiedCount > 0;
  }

  async findUserByRefreshTokenHash(tokenHash: string): Promise<StoredUser | null> {
    const now = new Date();
    const doc = await UserModel.findOne({
      refreshTokens: {
        $elemMatch: {
          tokenHash: { $eq: tokenHash },
          expiresAt: { $gt: now },
          $or: [
            { sessionExpiresAt: { $exists: false } },
            { sessionExpiresAt: null },
            { sessionExpiresAt: { $gt: now } },
          ],
        },
      },
    }).lean();
    return doc ? toStoredUser(doc) : null;
  }

  async findConsumedRefreshToken(
    tokenHash: string
  ): Promise<{ userId: string; familyId: string; rotatedAt: string } | null> {
    const pruneBefore = new Date(Date.now() - CONSUMED_TOKEN_RETENTION_MS);
    const doc = await UserModel.findOne(
      {
        consumedRefreshTokens: {
          $elemMatch: {
            tokenHash: { $eq: tokenHash },
            rotatedAt: { $gt: pruneBefore },
          },
        },
      },
      { _id: 1, consumedRefreshTokens: 1 }
    ).lean();
    if (!doc) return null;
    const match = (doc.consumedRefreshTokens ?? []).find(
      (c) =>
        c.tokenHash === tokenHash &&
        new Date(c.rotatedAt).getTime() > pruneBefore.getTime()
    );
    if (!match) return null;
    return {
      userId: String(doc._id),
      familyId: match.familyId,
      rotatedAt: new Date(match.rotatedAt).toISOString(),
    };
  }

  async rotateRefreshToken(
    userId: string,
    oldHash: string,
    newToken: StoredRefreshToken,
    consumedFamilyId: string
  ): Promise<StoredUser | null> {
    if (!mongoose.Types.ObjectId.isValid(userId)) return null;
    const now = new Date();
    const pruneBefore = new Date(now.getTime() - CONSUMED_TOKEN_RETENTION_MS);
    const nextEntry = toRefreshTokenDoc(newToken);
    const updated = await UserModel.findOneAndUpdate(
      {
        _id: userId,
        refreshTokens: {
          $elemMatch: {
            tokenHash: { $eq: oldHash },
            expiresAt: { $gt: now },
            $or: [
              { sessionExpiresAt: { $exists: false } },
              { sessionExpiresAt: null },
              { sessionExpiresAt: { $gt: now } },
            ],
          },
        },
      },
      [
        {
          $set: {
            refreshTokens: {
              $slice: [
                {
                  $concatArrays: [
                    {
                      $filter: {
                        input: { $ifNull: ['$refreshTokens', []] },
                        as: 't',
                        cond: {
                          $and: [
                            { $ne: ['$$t.tokenHash', oldHash] },
                            { $gt: ['$$t.expiresAt', now] },
                            {
                              $or: [
                                {
                                  $eq: [
                                    { $ifNull: ['$$t.sessionExpiresAt', null] },
                                    null,
                                  ],
                                },
                                { $gt: ['$$t.sessionExpiresAt', now] },
                              ],
                            },
                          ],
                        },
                      },
                    },
                    [nextEntry],
                  ],
                },
                -MAX_ACTIVE_SESSIONS,
              ],
            },
            consumedRefreshTokens: {
              $slice: [
                {
                  $concatArrays: [
                    {
                      $filter: {
                        input: { $ifNull: ['$consumedRefreshTokens', []] },
                        as: 'c',
                        cond: { $gt: ['$$c.rotatedAt', pruneBefore] },
                      },
                    },
                    [
                      {
                        tokenHash: oldHash,
                        familyId: consumedFamilyId,
                        rotatedAt: now,
                      },
                    ],
                  ],
                },
                -MAX_CONSUMED_REFRESH_TOKENS,
              ],
            },
          },
        },
      ],
      { new: true, updatePipeline: true }
    ).lean();
    return updated ? toStoredUser(updated) : null;
  }

  async revokeRefreshToken(tokenHash: string): Promise<boolean> {
    const result = await UserModel.updateMany(
      { 'refreshTokens.tokenHash': { $eq: tokenHash } },
      { $pull: { refreshTokens: { tokenHash: { $eq: tokenHash } } } }
    );
    return result.modifiedCount > 0;
  }

  async revokeRefreshTokenFamily(
    userId: string,
    familyId: string,
    consumedTokenHash: string
  ): Promise<void> {
    if (!mongoose.Types.ObjectId.isValid(userId)) return;
    await UserModel.updateOne(
      {
        _id: userId,
        'consumedRefreshTokens.tokenHash': { $eq: consumedTokenHash },
      },
      {
        $pull: {
          refreshTokens: { familyId: { $eq: familyId } },
          consumedRefreshTokens: { familyId: { $eq: familyId } },
        },
        $inc: { tokenVersion: 1 },
      }
    );
  }

  async incrementTokenVersion(
    userId: string,
    expectedTokenVersion: number
  ): Promise<boolean> {
    if (!mongoose.Types.ObjectId.isValid(userId)) return false;
    const result = await UserModel.updateOne(
      { _id: userId, ...tokenVersionFilter(expectedTokenVersion) },
      [{ $set: { tokenVersion: { $add: [{ $ifNull: ['$tokenVersion', 0] }, 1] } } }],
      { updatePipeline: true }
    );
    return result.modifiedCount > 0;
  }

  async updatePasswordAndReplaceSessions(
    userId: string,
    expectedPasswordHash: string,
    newPasswordHash: string,
    newToken: StoredRefreshToken
  ): Promise<StoredUser | null> {
    if (!mongoose.Types.ObjectId.isValid(userId)) return null;
    const nextEntry = toRefreshTokenDoc(newToken);
    const updated = await UserModel.findOneAndUpdate(
      { _id: userId, passwordHash: { $eq: expectedPasswordHash } },
      {
        $set: {
          passwordHash: newPasswordHash,
          refreshTokens: [nextEntry],
          consumedRefreshTokens: [],
        },
        $inc: { tokenVersion: 1 },
      },
      { new: true }
    ).lean();
    return updated ? toStoredUser(updated) : null;
  }
}
