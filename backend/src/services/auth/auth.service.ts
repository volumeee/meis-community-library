import crypto from 'node:crypto';
import type { AuthStatusResponse, AuthUser } from '../../../../shared/library';
import { AppError, RefreshGraceError } from '../../errors';
import type { IAuthRepository, StoredUser } from '../../repositories/auth';
import {
  generateRefreshToken,
  hashPassword,
  hashRefreshToken,
  signAccessToken,
  verifyAccessToken,
  verifyDummyPassword,
  verifyPassword,
} from '../../utils/crypto';
import {
  validateChangePasswordPayload,
  validateLoginPayload,
  validateSetupPayload,
} from '../../validators/auth.validator';
import {
  ABSOLUTE_SESSION_TTL_MS,
  DEFAULT_LIBRARIAN_EMAIL,
  DEFAULT_LIBRARIAN_NAME,
  MAX_IP_EMAIL_LOGIN_ATTEMPTS,
  MAX_IP_LOGIN_ATTEMPTS,
  MAX_PASSWORD_CHANGE_ATTEMPTS,
  MAX_SETUP_ATTEMPTS,
  MULTI_TAB_GRACE_MS,
  RATE_LIMIT_WINDOW_MS,
} from './auth.constants';
import { toAuthUser, type IssuedAuthSession } from './auth.types';
import { EnvAdminSessionStore } from './env-admin-session.store';

export class AuthService {
  private readonly envSessions = new EnvAdminSessionStore();

  constructor(private readonly repo: IAuthRepository) {}

  async assertSetupRateLimit(clientKey: string): Promise<void> {
    const attempts = await this.repo.consumeLoginAttempt(
      `setup:${clientKey}`,
      RATE_LIMIT_WINDOW_MS
    );
    if (attempts > MAX_SETUP_ATTEMPTS) {
      throw new AppError(
        429,
        'Too many setup attempts. Please wait a few minutes and try again.'
      );
    }
  }

  async getStatus(): Promise<AuthStatusResponse> {
    const defaultProfile = {
      name: DEFAULT_LIBRARIAN_NAME,
      email: DEFAULT_LIBRARIAN_EMAIL,
    };
    if (this.envSessions.getConfig()) {
      return {
        databaseConnected: true,
        needsSetup: false,
        defaultProfile,
      };
    }
    const count = await this.repo.countUsers();
    return {
      databaseConnected: true,
      needsSetup: count === 0,
      defaultProfile,
    };
  }

  private async issuePersistedSession(user: StoredUser): Promise<IssuedAuthSession> {
    const authUser = toAuthUser(user);
    const familyId = crypto.randomUUID();
    const sessionExpiresAt = new Date(Date.now() + ABSOLUTE_SESSION_TTL_MS).toISOString();
    const refresh = generateRefreshToken();
    const added = await this.repo.addRefreshToken(authUser.id, user.tokenVersion, {
      tokenHash: refresh.tokenHash,
      expiresAt: refresh.expiresAt,
      familyId,
      sessionExpiresAt,
    });
    if (!added) {
      throw new AppError(401, 'Session expired. Please sign in again.');
    }

    const access = signAccessToken({
      sub: authUser.id,
      email: authUser.email,
      name: authUser.name,
      role: authUser.role,
      tv: user.tokenVersion,
    });

    return {
      user: authUser,
      accessToken: access.token,
      expiresInSeconds: access.expiresInSeconds,
      refreshToken: refresh.rawToken,
      refreshMaxAgeSeconds: refresh.maxAgeSeconds,
    };
  }

  async setupInitialAccount(
    raw: unknown,
    clientKey?: string
  ): Promise<IssuedAuthSession> {
    if (clientKey) {
      await this.assertSetupRateLimit(clientKey);
    }
    if (this.envSessions.getConfig()) {
      throw new AppError(
        409,
        'Librarian account is already configured via server environment.'
      );
    }

    const { name, email, password } = validateSetupPayload(raw);

    if ((await this.repo.countUsers()) > 0) {
      throw new AppError(
        409,
        'The librarian account has already been set up. Please sign in instead.'
      );
    }

    const passwordHash = await hashPassword(password);
    const created = await this.repo.createFirstUserAtomic({
      name,
      email,
      passwordHash,
    });

    if (!created) {
      throw new AppError(
        409,
        'The librarian account has already been set up. Please sign in instead.'
      );
    }

    return this.issuePersistedSession(created);
  }

  async login(raw: unknown, clientKey: string): Promise<IssuedAuthSession> {
    const ipAttempts = await this.repo.consumeLoginAttempt(
      `ip:${clientKey}`,
      RATE_LIMIT_WINDOW_MS
    );
    if (ipAttempts > MAX_IP_LOGIN_ATTEMPTS) {
      throw new AppError(
        429,
        'Too many failed sign-in attempts. Please wait a few minutes and try again.'
      );
    }

    const { email, password } = validateLoginPayload(raw);

    const ipEmailAttempts = await this.repo.consumeLoginAttempt(
      `ip-email:${clientKey}:${email}`,
      RATE_LIMIT_WINDOW_MS
    );
    if (ipEmailAttempts > MAX_IP_EMAIL_LOGIN_ATTEMPTS) {
      throw new AppError(
        429,
        'Too many failed sign-in attempts. Please wait a few minutes and try again.'
      );
    }

    // Optional server-env admin override isolates authentication completely from MongoDB
    const envAdmin = this.envSessions.getConfig();
    if (envAdmin) {
      if (!this.envSessions.verifyCredentials(envAdmin, email, password)) {
        throw new AppError(401, 'Invalid email or password.');
      }
      await Promise.all([
        this.repo.clearLoginAttempts(`ip:${clientKey}`),
        this.repo.clearLoginAttempts(`ip-email:${clientKey}:${email}`),
      ]);
      return this.envSessions.issueSession(envAdmin);
    }

    const user = await this.repo.findUserByEmail(email);
    if (!user) {
      await verifyDummyPassword(password);
      throw new AppError(401, 'Invalid email or password.');
    }

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      throw new AppError(401, 'Invalid email or password.');
    }

    await Promise.all([
      this.repo.clearLoginAttempts(`ip:${clientKey}`),
      this.repo.clearLoginAttempts(`ip-email:${clientKey}:${email}`),
    ]);
    return this.issuePersistedSession(user);
  }

  private async buildInactiveRefreshError(oldHash: string): Promise<AppError> {
    const consumed = await this.repo.findConsumedRefreshToken(oldHash);
    if (consumed) {
      const elapsedMs = Date.now() - new Date(consumed.rotatedAt).getTime();
      if (elapsedMs <= MULTI_TAB_GRACE_MS) {
        return new RefreshGraceError('Session was recently refreshed. Please retry.');
      }
      await this.repo.revokeRefreshTokenFamily(
        consumed.userId,
        consumed.familyId,
        oldHash
      );
    }
    return new AppError(401, 'Session expired. Please sign in again.');
  }

  async refresh(rawRefreshToken: string | undefined): Promise<IssuedAuthSession> {
    if (!rawRefreshToken || typeof rawRefreshToken !== 'string') {
      throw new AppError(401, 'Session expired. Please sign in again.');
    }

    const oldHash = hashRefreshToken(rawRefreshToken);
    const now = Date.now();

    // When env-configured admin is active, never fall through to MongoDB users
    const envAdmin = this.envSessions.getConfig();
    if (envAdmin) {
      return this.envSessions.refreshSession(envAdmin, oldHash, now);
    }

    const user = await this.repo.findUserByRefreshTokenHash(oldHash);
    if (!user) {
      throw await this.buildInactiveRefreshError(oldHash);
    }

    const activeToken = user.refreshTokens.find((t) => t.tokenHash === oldHash);
    if (!activeToken) {
      throw await this.buildInactiveRefreshError(oldHash);
    }

    const sessionExpiresAtMs = activeToken.sessionExpiresAt
      ? new Date(activeToken.sessionExpiresAt).getTime()
      : now + ABSOLUTE_SESSION_TTL_MS;
    if (Number.isNaN(sessionExpiresAtMs) || sessionExpiresAtMs <= now) {
      await this.repo.revokeRefreshToken(oldHash);
      throw new AppError(401, 'Session expired. Please sign in again.');
    }

    const familyId = activeToken.familyId ?? crypto.randomUUID();
    const nextRefresh = generateRefreshToken(sessionExpiresAtMs);
    const updatedUser = await this.repo.rotateRefreshToken(
      user.id,
      oldHash,
      {
        tokenHash: nextRefresh.tokenHash,
        expiresAt: nextRefresh.expiresAt,
        familyId,
        sessionExpiresAt: new Date(sessionExpiresAtMs).toISOString(),
      },
      familyId
    );

    if (!updatedUser) {
      throw await this.buildInactiveRefreshError(oldHash);
    }

    const authUser = toAuthUser(updatedUser);
    const access = signAccessToken({
      sub: authUser.id,
      email: authUser.email,
      name: authUser.name,
      role: authUser.role,
      tv: updatedUser.tokenVersion,
    });
    return {
      user: authUser,
      accessToken: access.token,
      expiresInSeconds: access.expiresInSeconds,
      refreshToken: nextRefresh.rawToken,
      refreshMaxAgeSeconds: nextRefresh.maxAgeSeconds,
    };
  }

  async logout(
    rawRefreshToken: string | undefined,
    rawAccessToken?: string | undefined
  ): Promise<void> {
    const envAdmin = this.envSessions.getConfig();
    const revokedUserIds = new Set<string>();

    if (rawRefreshToken && typeof rawRefreshToken === 'string') {
      const tokenHash = hashRefreshToken(rawRefreshToken);
      if (envAdmin) {
        this.envSessions.revokeRefreshToken(envAdmin, tokenHash);
      } else {
        const user = await this.repo.findUserByRefreshTokenHash(tokenHash);
        const removed = await this.repo.revokeRefreshToken(tokenHash);
        if (user && removed) {
          await this.repo.incrementTokenVersion(user.id, user.tokenVersion);
          revokedUserIds.add(user.id);
        }
      }
    }

    if (rawAccessToken && typeof rawAccessToken === 'string') {
      const payload = verifyAccessToken(rawAccessToken);
      if (payload) {
        if (envAdmin) {
          this.envSessions.revokeAccessPayload(envAdmin, payload);
        } else if (
          payload.sub !== 'env-librarian' &&
          !payload.sub.startsWith('env-librarian:') &&
          !revokedUserIds.has(payload.sub)
        ) {
          await this.repo.incrementTokenVersion(payload.sub, payload.tv);
        }
      }
    }
  }

  async changePassword(userId: string, raw: unknown): Promise<IssuedAuthSession> {
    if (
      userId === 'env-librarian' ||
      userId.startsWith('env-librarian:') ||
      this.envSessions.getConfig()
    ) {
      throw new AppError(
        403,
        'Password for an environment-configured librarian account must be changed on the server.'
      );
    }

    const { currentPassword, newPassword } = validateChangePasswordPayload(raw);

    const attempts = await this.repo.consumeLoginAttempt(
      `pw:${userId}`,
      RATE_LIMIT_WINDOW_MS
    );
    if (attempts > MAX_PASSWORD_CHANGE_ATTEMPTS) {
      throw new AppError(
        429,
        'Too many password change attempts. Please wait a few minutes and try again.'
      );
    }

    const user = await this.repo.findUserById(userId);
    if (!user) {
      throw new AppError(401, 'Session expired. Please sign in again.');
    }

    const isValid = await verifyPassword(currentPassword, user.passwordHash);
    if (!isValid) {
      throw new AppError(400, 'Current password is incorrect.', {
        currentPassword: 'Current password is incorrect.',
      });
    }

    const nextHash = await hashPassword(newPassword);
    const familyId = crypto.randomUUID();
    const sessionExpiresAt = new Date(Date.now() + ABSOLUTE_SESSION_TTL_MS).toISOString();
    const nextRefresh = generateRefreshToken();
    const updated = await this.repo.updatePasswordAndReplaceSessions(
      user.id,
      user.passwordHash,
      nextHash,
      {
        tokenHash: nextRefresh.tokenHash,
        expiresAt: nextRefresh.expiresAt,
        familyId,
        sessionExpiresAt,
      }
    );
    if (!updated) {
      throw new AppError(
        409,
        'Password was updated by another request. Please try again.'
      );
    }

    await this.repo.clearLoginAttempts(`pw:${userId}`);
    const authUser = toAuthUser(updated);
    const access = signAccessToken({
      sub: authUser.id,
      email: authUser.email,
      name: authUser.name,
      role: authUser.role,
      tv: updated.tokenVersion,
    });

    return {
      user: authUser,
      accessToken: access.token,
      expiresInSeconds: access.expiresInSeconds,
      refreshToken: nextRefresh.rawToken,
      refreshMaxAgeSeconds: nextRefresh.maxAgeSeconds,
    };
  }

  async verifyBearerToken(token: string): Promise<AuthUser | null> {
    const payload = verifyAccessToken(token);
    if (!payload) {
      return null;
    }

    const envAdmin = this.envSessions.getConfig();
    if (envAdmin) {
      return this.envSessions.verifyAccessPayload(envAdmin, payload);
    }

    if (payload.sub === 'env-librarian' || payload.sub.startsWith('env-librarian:')) {
      return null;
    }

    const user = await this.repo.findUserById(payload.sub);
    if (!user || payload.tv !== user.tokenVersion) {
      return null;
    }
    return toAuthUser(user);
  }
}
