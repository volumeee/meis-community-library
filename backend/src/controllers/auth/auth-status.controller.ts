import type { NextFunction, Request, Response } from 'express';
import type { DatabaseState } from '../../config/database';
import type { AuthenticatedRequest } from '../../middleware/auth.middleware';
import {
  DEFAULT_LIBRARIAN_EMAIL,
  DEFAULT_LIBRARIAN_NAME,
  type AuthService,
} from '../../services/auth';
import { parseCookieHeaderValues, REFRESH_COOKIE_NAME } from '../../utils/http/cookies';

export class AuthStatusController {
  constructor(
    private readonly authService: AuthService,
    private readonly ensureDatabase?: () => Promise<DatabaseState>
  ) {}

  getStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.setHeader('Cache-Control', 'no-store');
      if (this.ensureDatabase) {
        const dbState = await this.ensureDatabase();
        if (!dbState.connected) {
          res.json({
            databaseConnected: false,
            databaseError:
              process.env.NODE_ENV === 'production'
                ? 'Database service is currently unavailable. Please check the server configuration.'
                : dbState.lastError ||
                  'MongoDB is not connected. Add MONGODB_URI to your environment configuration.',
            needsSetup: false,
            requiresSetupToken: false,
            hasSessionCookie: false,
            defaultProfile: {
              name: DEFAULT_LIBRARIAN_NAME,
              email: DEFAULT_LIBRARIAN_EMAIL,
            },
          });
          return;
        }
      }

      const status = await this.authService.getStatus();
      const refreshCookies = parseCookieHeaderValues(
        req.header('cookie'),
        REFRESH_COOKIE_NAME
      );
      const requiresSetupToken =
        status.needsSetup &&
        (process.env.NODE_ENV === 'production' ||
          Boolean(process.env.SETUP_TOKEN?.trim()));
      res.json({
        ...status,
        databaseConnected: true,
        requiresSetupToken,
        hasSessionCookie: refreshCookies.some(Boolean) && !status.needsSetup,
      });
    } catch (error) {
      next(error);
    }
  };

  getMe = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    res.setHeader('Cache-Control', 'no-store');
    res.json({ user: req.user });
  };
}
