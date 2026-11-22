import crypto from 'node:crypto';
import type { AuthUser } from '../../../../shared/library';
import { AppError, RefreshGraceError } from '../../errors';
import {
  generateRefreshToken,
  getJwtSecret,
  signAccessToken,
  timingSafeStringEqual,
  type AccessTokenPayload,
} from '../../utils/crypto';
import {
  ABSOLUTE_SESSION_TTL_MS,
  CONSUMED_TOKEN_RETENTION_MS,
  DEFAULT_LIBRARIAN_EMAIL,
  DEFAULT_LIBRARIAN_NAME,
  MAX_CONSUMED_ENV_TOKENS,
  MAX_ENV_SESSIONS,
  MULTI_TAB_GRACE_MS,
} from './auth.constants';
import type { EnvAdminConfig, IssuedAuthSession } from './auth.types';

interface EnvRefreshTokenEntry {
  expiresAtMs: number;
  sessionExpiresAtMs: number;
  familyId: string;
  subject: string;
}

interface EnvConsumedRefreshTokenEntry {
  familyId: string;
  rotatedAtMs: number;
  subject: string;
}

export class EnvAdminSessionStore {
  private readonly bootNonce = crypto.randomBytes(16).toString('hex');
  private readonly refreshTokens = new Map<string, EnvRefreshTokenEntry>();
  private readonly consumedRefreshTokens = new Map<
    string,
    EnvConsumedRefreshTokenEntry
  >();
  private tokenVersion = 0;

  getConfig(): EnvAdminConfig | null {
    const password = process.env.LIBRARIAN_PASSWORD?.trim();
    if (!password || password.length < 8) {
      return null;
    }
    const email =
      process.env.LIBRARIAN_EMAIL?.trim().toLowerCase() || DEFAULT_LIBRARIAN_EMAIL;
    const name = process.env.LIBRARIAN_NAME?.trim() || DEFAULT_LIBRARIAN_NAME;
    return { email, name, password };
  }

  private getSubject(envAdmin: Pick<EnvAdminConfig, 'email' | 'password'>): string {
    const epoch = crypto
      .createHmac('sha256', getJwtSecret())
      .update(`${this.bootNonce}\0${envAdmin.email}\0${envAdmin.password}`)
      .digest('hex')
      .slice(0, 16);
    return `env-librarian:${epoch}`;
  }

  private toEnvAuthUser(envAdmin: EnvAdminConfig): AuthUser {
    return {
      id: 'env-librarian',
      name: envAdmin.name,
      email: envAdmin.email,
      role: 'admin',
      canChangePassword: false,
    };
  }

  private recordRefreshToken(tokenHash: string, entry: EnvRefreshTokenEntry): void {
    const now = Date.now();
    for (const [hash, existing] of this.refreshTokens.entries()) {
      if (existing.expiresAtMs <= now || existing.sessionExpiresAtMs <= now) {
        this.refreshTokens.delete(hash);
      }
    }
    while (this.refreshTokens.size >= MAX_ENV_SESSIONS) {
      const oldestKey = this.refreshTokens.keys().next().value;
      if (oldestKey === undefined) break;
      this.refreshTokens.delete(oldestKey);
    }
    this.refreshTokens.set(tokenHash, entry);
  }

  private recordConsumedToken(
    tokenHash: string,
    familyId: string,
    subject: string,
    now: number
  ): void {
    const pruneBefore = now - CONSUMED_TOKEN_RETENTION_MS;
    for (const [hash, entry] of this.consumedRefreshTokens.entries()) {
      if (entry.rotatedAtMs <= pruneBefore) {
        this.consumedRefreshTokens.delete(hash);
      }
    }
    while (this.consumedRefreshTokens.size >= MAX_CONSUMED_ENV_TOKENS) {
      const oldestKey = this.consumedRefreshTokens.keys().next().value;
      if (oldestKey === undefined) break;
      this.consumedRefreshTokens.delete(oldestKey);
    }
    this.consumedRefreshTokens.set(tokenHash, { familyId, subject, rotatedAtMs: now });
  }

  verifyCredentials(envAdmin: EnvAdminConfig, email: string, password: string): boolean {
    const emailOk = timingSafeStringEqual(email, envAdmin.email);
    const passOk = timingSafeStringEqual(password, envAdmin.password);
    return emailOk && passOk;
  }

  issueSession(envAdmin: EnvAdminConfig): IssuedAuthSession {
    const authUser = this.toEnvAuthUser(envAdmin);
    const subject = this.getSubject(envAdmin);
    const access = signAccessToken({
      sub: subject,
      email: authUser.email,
      name: authUser.name,
      role: authUser.role,
      tv: this.tokenVersion,
    });
    const now = Date.now();
    const familyId = crypto.randomUUID();
    const sessionExpiresAtMs = now + ABSOLUTE_SESSION_TTL_MS;
    const refresh = generateRefreshToken(sessionExpiresAtMs);
    this.recordRefreshToken(refresh.tokenHash, {
      expiresAtMs: new Date(refresh.expiresAt).getTime(),
      sessionExpiresAtMs,
      familyId,
      subject,
    });
    return {
      user: authUser,
      accessToken: access.token,
      expiresInSeconds: access.expiresInSeconds,
      refreshToken: refresh.rawToken,
      refreshMaxAgeSeconds: refresh.maxAgeSeconds,
    };
  }

  refreshSession(
    envAdmin: EnvAdminConfig,
    oldHash: string,
    now: number
  ): IssuedAuthSession {
    const subject = this.getSubject(envAdmin);
    const entry = this.refreshTokens.get(oldHash);
    if (
      entry &&
      entry.subject === subject &&
      entry.expiresAtMs > now &&
      entry.sessionExpiresAtMs > now
    ) {
      this.refreshTokens.delete(oldHash);
      this.recordConsumedToken(oldHash, entry.familyId, subject, now);
      const nextRefresh = generateRefreshToken(entry.sessionExpiresAtMs);
      this.recordRefreshToken(nextRefresh.tokenHash, {
        expiresAtMs: new Date(nextRefresh.expiresAt).getTime(),
        sessionExpiresAtMs: entry.sessionExpiresAtMs,
        familyId: entry.familyId,
        subject,
      });
      const authUser = this.toEnvAuthUser(envAdmin);
      const access = signAccessToken({
        sub: subject,
        email: authUser.email,
        name: authUser.name,
        role: authUser.role,
        tv: this.tokenVersion,
      });
      return {
        user: authUser,
        accessToken: access.token,
        expiresInSeconds: access.expiresInSeconds,
        refreshToken: nextRefresh.rawToken,
        refreshMaxAgeSeconds: nextRefresh.maxAgeSeconds,
      };
    }

    if (entry) {
      this.refreshTokens.delete(oldHash);
      throw new AppError(401, 'Session expired. Please sign in again.');
    }

    const pruneBefore = now - CONSUMED_TOKEN_RETENTION_MS;
    for (const [hash, consumedEntry] of this.consumedRefreshTokens.entries()) {
      if (consumedEntry.rotatedAtMs <= pruneBefore) {
        this.consumedRefreshTokens.delete(hash);
      }
    }
    const consumed = this.consumedRefreshTokens.get(oldHash);
    if (consumed) {
      if (consumed.subject !== subject) {
        this.consumedRefreshTokens.delete(oldHash);
        throw new AppError(401, 'Session expired. Please sign in again.');
      }
      if (now - consumed.rotatedAtMs <= MULTI_TAB_GRACE_MS) {
        throw new RefreshGraceError('Session was recently refreshed. Please retry.');
      }
      for (const [hash, active] of this.refreshTokens.entries()) {
        if (active.familyId === consumed.familyId) {
          this.refreshTokens.delete(hash);
        }
      }
      for (const [hash, c] of this.consumedRefreshTokens.entries()) {
        if (c.familyId === consumed.familyId) {
          this.consumedRefreshTokens.delete(hash);
        }
      }
      this.tokenVersion += 1;
    }

    throw new AppError(401, 'Session expired. Please sign in again.');
  }

  revokeRefreshToken(envAdmin: EnvAdminConfig, tokenHash: string): void {
    const entry = this.refreshTokens.get(tokenHash);
    this.refreshTokens.delete(tokenHash);
    const now = Date.now();
    if (
      entry &&
      entry.subject === this.getSubject(envAdmin) &&
      entry.expiresAtMs > now &&
      entry.sessionExpiresAtMs > now
    ) {
      this.tokenVersion += 1;
    }
  }

  revokeAccessPayload(envAdmin: EnvAdminConfig, payload: AccessTokenPayload): void {
    if (
      timingSafeStringEqual(payload.sub, this.getSubject(envAdmin)) &&
      payload.tv === this.tokenVersion
    ) {
      this.tokenVersion += 1;
    }
  }

  verifyAccessPayload(
    envAdmin: EnvAdminConfig,
    payload: AccessTokenPayload
  ): AuthUser | null {
    if (
      !timingSafeStringEqual(payload.sub, this.getSubject(envAdmin)) ||
      payload.tv !== this.tokenVersion
    ) {
      return null;
    }
    return this.toEnvAuthUser(envAdmin);
  }
}
