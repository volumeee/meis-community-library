import type { NextFunction, Response } from 'express';
import { AppError } from '../../errors';
import type { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { assertCsrfOrigin } from '../../middleware/csrf.middleware';
import type { AuthService } from '../../services/auth';
import { setRefreshCookie } from '../../utils/http/cookies';

export class AuthPasswordController {
  constructor(private readonly authService: AuthService) {}

  changePassword = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      assertCsrfOrigin(req);
      if (!req.user) {
        throw new AppError(401, 'Authentication required. Please sign in.');
      }
      const session = await this.authService.changePassword(req.user.id, req.body);
      setRefreshCookie(req, res, session.refreshToken, session.refreshMaxAgeSeconds);
      res.setHeader('Cache-Control', 'no-store');
      res.json({
        user: session.user,
        accessToken: session.accessToken,
        expiresInSeconds: session.expiresInSeconds,
      });
    } catch (error) {
      next(error);
    }
  };
}
