import type { NextFunction, Request, Response } from 'express';
import type { AuthUser } from '../../../shared/library';
import { AppError } from '../errors';
import type { AuthService } from '../services/auth';

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

export function createRequireAuth(authService: AuthService) {
  return async (
    req: AuthenticatedRequest,
    _res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const authHeader = req.header('authorization') || '';
      if (!authHeader.startsWith('Bearer ')) {
        throw new AppError(401, 'Authentication required. Please sign in.');
      }
      const token = authHeader.slice('Bearer '.length).trim();
      const user = await authService.verifyBearerToken(token);
      if (!user) {
        throw new AppError(401, 'Invalid or expired access token. Please sign in again.');
      }
      req.user = user;
      next();
    } catch (error) {
      next(error);
    }
  };
}
