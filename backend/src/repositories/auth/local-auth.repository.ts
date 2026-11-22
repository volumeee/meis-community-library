import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {
  CONSUMED_TOKEN_RETENTION_MS,
  MAX_ACTIVE_SESSIONS,
  MAX_CONSUMED_REFRESH_TOKENS,
  type IAuthRepository,
  type StoredRefreshToken,
  type StoredUser,
} from './auth.repository.interface';

interface LocalAuthStoreData {
  users: StoredUser[];
}

export class LocalAuthRepository implements IAuthRepository {
  private readonly filePath: string | null;
  private data: LocalAuthStoreData = { users: [] };
  private readonly loginAttempts = new Map<string, { count: number; resetAt: number }>();

  constructor(options?: { filePath?: string; inMemoryOnly?: boolean }) {
    if (options?.inMemoryOnly) {
      this.filePath = null;
    } else {
      this.filePath =
        options?.filePath ?? path.resolve(process.cwd(), 'data', 'auth-store.json');
      this.loadFromDisk();
    }
  }

  private loadFromDisk(): void {
    if (!this.filePath) return;
    try {
      if (fs.existsSync(this.filePath)) {
        const parsed = JSON.parse(
          fs.readFileSync(this.filePath, 'utf-8')
        ) as Partial<LocalAuthStoreData>;
        this.data = {
          users: Array.isArray(parsed.users)
            ? parsed.users.map((u) => ({
                ...u,
                tokenVersion: typeof u.tokenVersion === 'number' ? u.tokenVersion : 0,
                refreshTokens: Array.isArray(u.refreshTokens) ? u.refreshTokens : [],
                consumedRefreshTokens: Array.isArray(u.consumedRefreshTokens)
                  ? u.consumedRefreshTokens
                  : [],
              }))
            : [],
        };
      }
    } catch {
      this.data = { users: [] };
    }
  }

  private saveToDisk(): void {
    if (!this.filePath) return;
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), 'utf-8');
  }

  private pruneExpiredLoginAttempts(now: number): void {
    for (const [key, entry] of this.loginAttempts.entries()) {
      if (now >= entry.resetAt) {
        this.loginAttempts.delete(key);
      }
    }
  }

  private cloneUser(user: StoredUser): StoredUser {
    return {
      ...user,
      refreshTokens: user.refreshTokens.map((t) => ({ ...t })),
      consumedRefreshTokens: (user.consumedRefreshTokens ?? []).map((c) => ({ ...c })),
    };
  }

  async consumeLoginAttempt(clientKey: string, windowMs: number): Promise<number> {
    const now = Date.now();
    this.pruneExpiredLoginAttempts(now);
    const previous = this.loginAttempts.get(clientKey);
    const record =
      !previous || now >= previous.resetAt
        ? { count: 1, resetAt: now + windowMs }
        : { ...previous, count: previous.count + 1 };
    this.loginAttempts.set(clientKey, record);
    return record.count;
  }

  async clearLoginAttempts(clientKey: string): Promise<void> {
    this.pruneExpiredLoginAttempts(Date.now());
    this.loginAttempts.delete(clientKey);
  }

  async countUsers(): Promise<number> {
    return this.data.users.length;
  }

  async findUserByEmail(email: string): Promise<StoredUser | null> {
    const normalized = email.trim().toLowerCase();
    const found = this.data.users.find((u) => u.email === normalized);
    return found ? this.cloneUser(found) : null;
  }

  async findUserById(id: string): Promise<StoredUser | null> {
    const found = this.data.users.find((u) => u.id === id);
    return found ? this.cloneUser(found) : null;
  }

  async createFirstUserAtomic(input: {
    name: string;
    email: string;
    passwordHash: string;
  }): Promise<StoredUser | null> {
    if (this.data.users.length > 0) {
      return null;
    }
    const user: StoredUser = {
      id: crypto.randomBytes(12).toString('hex'),
      name: input.name,
      email: input.email.trim().toLowerCase(),
      role: 'admin',
      passwordHash: input.passwordHash,
      tokenVersion: 0,
      refreshTokens: [],
      consumedRefreshTokens: [],
      createdAt: new Date().toISOString(),
    };
    this.data.users.push(user);
    this.saveToDisk();
    return this.cloneUser(user);
  }

  async addRefreshToken(
    userId: string,
    expectedTokenVersion: number,
    token: StoredRefreshToken
  ): Promise<boolean> {
    const user = this.data.users.find(
      (u) => u.id === userId && u.tokenVersion === expectedTokenVersion
    );
    if (!user) return false;
    const nowMs = Date.now();
    user.refreshTokens = user.refreshTokens
      .filter(
        (t) =>
          new Date(t.expiresAt).getTime() > nowMs &&
          (!t.sessionExpiresAt || new Date(t.sessionExpiresAt).getTime() > nowMs)
      )
      .slice(-(MAX_ACTIVE_SESSIONS - 1));
    user.refreshTokens.push({ ...token });
    this.saveToDisk();
    return true;
  }

  async findUserByRefreshTokenHash(tokenHash: string): Promise<StoredUser | null> {
    const nowMs = Date.now();
    const found = this.data.users.find((u) =>
      u.refreshTokens.some(
        (t) =>
          t.tokenHash === tokenHash &&
          new Date(t.expiresAt).getTime() > nowMs &&
          (!t.sessionExpiresAt || new Date(t.sessionExpiresAt).getTime() > nowMs)
      )
    );
    return found ? this.cloneUser(found) : null;
  }

  async findConsumedRefreshToken(
    tokenHash: string
  ): Promise<{ userId: string; familyId: string; rotatedAt: string } | null> {
    const pruneBeforeMs = Date.now() - CONSUMED_TOKEN_RETENTION_MS;
    for (const user of this.data.users) {
      const list = user.consumedRefreshTokens ?? [];
      const match = list.find(
        (c) =>
          c.tokenHash === tokenHash && new Date(c.rotatedAt).getTime() > pruneBeforeMs
      );
      if (match) {
        return { userId: user.id, familyId: match.familyId, rotatedAt: match.rotatedAt };
      }
    }
    return null;
  }

  async rotateRefreshToken(
    userId: string,
    oldHash: string,
    newToken: StoredRefreshToken,
    consumedFamilyId: string
  ): Promise<StoredUser | null> {
    const user = this.data.users.find((u) => u.id === userId);
    if (!user) return null;
    const nowMs = Date.now();
    const idx = user.refreshTokens.findIndex(
      (t) =>
        t.tokenHash === oldHash &&
        new Date(t.expiresAt).getTime() > nowMs &&
        (!t.sessionExpiresAt || new Date(t.sessionExpiresAt).getTime() > nowMs)
    );
    if (idx === -1) return null;
    user.refreshTokens.splice(idx, 1);
    user.refreshTokens = user.refreshTokens
      .filter(
        (t) =>
          new Date(t.expiresAt).getTime() > nowMs &&
          (!t.sessionExpiresAt || new Date(t.sessionExpiresAt).getTime() > nowMs)
      )
      .slice(-(MAX_ACTIVE_SESSIONS - 1));
    user.refreshTokens.push({ ...newToken });

    const pruneBeforeMs = nowMs - CONSUMED_TOKEN_RETENTION_MS;
    user.consumedRefreshTokens = (user.consumedRefreshTokens ?? [])
      .filter((c) => new Date(c.rotatedAt).getTime() > pruneBeforeMs)
      .slice(-(MAX_CONSUMED_REFRESH_TOKENS - 1));
    user.consumedRefreshTokens.push({
      tokenHash: oldHash,
      familyId: consumedFamilyId,
      rotatedAt: new Date(nowMs).toISOString(),
    });

    this.saveToDisk();
    return this.cloneUser(user);
  }

  async revokeRefreshToken(tokenHash: string): Promise<boolean> {
    let changed = false;
    for (const user of this.data.users) {
      const before = user.refreshTokens.length;
      user.refreshTokens = user.refreshTokens.filter((t) => t.tokenHash !== tokenHash);
      if (user.refreshTokens.length !== before) {
        changed = true;
      }
    }
    if (changed) {
      this.saveToDisk();
    }
    return changed;
  }

  async revokeRefreshTokenFamily(
    userId: string,
    familyId: string,
    consumedTokenHash: string
  ): Promise<void> {
    const user = this.data.users.find((u) => u.id === userId);
    if (!user) return;
    const consumed = user.consumedRefreshTokens ?? [];
    if (!consumed.some((c) => c.tokenHash === consumedTokenHash)) return;
    user.refreshTokens = user.refreshTokens.filter((t) => t.familyId !== familyId);
    user.consumedRefreshTokens = consumed.filter((c) => c.familyId !== familyId);
    user.tokenVersion = (user.tokenVersion ?? 0) + 1;
    this.saveToDisk();
  }

  async incrementTokenVersion(
    userId: string,
    expectedTokenVersion: number
  ): Promise<boolean> {
    const user = this.data.users.find(
      (u) => u.id === userId && (u.tokenVersion ?? 0) === expectedTokenVersion
    );
    if (!user) return false;
    user.tokenVersion = (user.tokenVersion ?? 0) + 1;
    this.saveToDisk();
    return true;
  }

  async updatePasswordAndReplaceSessions(
    userId: string,
    expectedPasswordHash: string,
    newPasswordHash: string,
    newToken: StoredRefreshToken
  ): Promise<StoredUser | null> {
    const user = this.data.users.find(
      (u) => u.id === userId && u.passwordHash === expectedPasswordHash
    );
    if (!user) return null;
    user.passwordHash = newPasswordHash;
    user.tokenVersion = (user.tokenVersion ?? 0) + 1;
    user.refreshTokens = [{ ...newToken }];
    user.consumedRefreshTokens = [];
    this.saveToDisk();
    return this.cloneUser(user);
  }
}
