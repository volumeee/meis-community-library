export const MAX_ACTIVE_SESSIONS = 10;
export const MAX_CONSUMED_REFRESH_TOKENS = 20;
export const CONSUMED_TOKEN_RETENTION_MS = 10 * 60 * 1000;

export interface StoredRefreshToken {
  tokenHash: string;
  expiresAt: string;
  familyId?: string;
  sessionExpiresAt?: string;
}

export interface ConsumedRefreshToken {
  tokenHash: string;
  familyId: string;
  rotatedAt: string;
}

export interface StoredUser {
  id: string;
  name: string;
  email: string;
  role: 'admin';
  passwordHash: string;
  tokenVersion: number;
  refreshTokens: StoredRefreshToken[];
  consumedRefreshTokens: ConsumedRefreshToken[];
  createdAt: string;
}

export interface IAuthRepository {
  countUsers(): Promise<number>;
  findUserByEmail(email: string): Promise<StoredUser | null>;
  findUserById(id: string): Promise<StoredUser | null>;
  createFirstUserAtomic(input: {
    name: string;
    email: string;
    passwordHash: string;
  }): Promise<StoredUser | null>;
  addRefreshToken(
    userId: string,
    expectedTokenVersion: number,
    token: StoredRefreshToken
  ): Promise<boolean>;
  findUserByRefreshTokenHash(tokenHash: string): Promise<StoredUser | null>;
  findConsumedRefreshToken(
    tokenHash: string
  ): Promise<{ userId: string; familyId: string; rotatedAt: string } | null>;
  rotateRefreshToken(
    userId: string,
    oldHash: string,
    newToken: StoredRefreshToken,
    consumedFamilyId: string
  ): Promise<StoredUser | null>;
  revokeRefreshToken(tokenHash: string): Promise<boolean>;
  revokeRefreshTokenFamily(
    userId: string,
    familyId: string,
    consumedTokenHash: string
  ): Promise<void>;
  incrementTokenVersion(userId: string, expectedTokenVersion: number): Promise<boolean>;
  updatePasswordAndReplaceSessions(
    userId: string,
    expectedPasswordHash: string,
    newPasswordHash: string,
    newToken: StoredRefreshToken
  ): Promise<StoredUser | null>;
  consumeLoginAttempt(clientKey: string, windowMs: number): Promise<number>;
  clearLoginAttempts(clientKey: string): Promise<void>;
}
