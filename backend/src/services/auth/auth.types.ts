import type { AuthUser } from '../../../../shared/library';
import type { StoredUser } from '../../repositories/auth';

export interface IssuedAuthSession {
  user: AuthUser;
  accessToken: string;
  expiresInSeconds: number;
  refreshToken: string;
  refreshMaxAgeSeconds: number;
}

export interface EnvAdminConfig {
  email: string;
  name: string;
  password: string;
}

export function toAuthUser(user: StoredUser): AuthUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    canChangePassword: true,
  };
}
