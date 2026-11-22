import type { NextFunction, Request, Response } from 'express';
import { AppError, RefreshGraceError } from '../../errors';
import { assertCsrfOrigin } from '../../middleware/csrf.middleware';
import type { AuthService, IssuedAuthSession } from '../../services/auth';
import { timingSafeStringEqual } from '../../utils/crypto';
import { getClientKey } from '../../utils/http/client-ip';
import {
  clearRefreshCookie,
  parseCookieHeaderValues,
  REFRESH_COOKIE_NAME,
  setRefreshCookie,
} from '../../utils/http/cookies';

function sendSessionResponse(
  req: Request,
  res: Response,
  session: IssuedAuthSession,
  statusCode = 200
): void {
  setRefreshCookie(req, res, session.refreshToken, session.refreshMaxAgeSeconds);
  res.setHeader('Cache-Control', 'no-store');
  res.status(statusCode).json({
    user: session.user,
    accessToken: session.accessToken,
    expiresInSeconds: session.expiresInSeconds,
  });
}

export class AuthSessionController {
  constructor(private readonly authService: AuthService) {}

  setup = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      assertCsrfOrigin(req);
      await this.authService.assertSetupRateLimit(getClientKey(req));
      const setupToken = process.env.SETUP_TOKEN?.trim() || '';
      if (process.env.NODE_ENV === 'production' || setupToken.length > 0) {
        const provided = req.header('x-setup-token') || '';
        if (setupToken.length < 32 || !timingSafeStringEqual(provided, setupToken)) {
          throw new AppError(403, 'Setup is not authorized.');
        }
      }
      const session = await this.authService.setupInitialAccount(req.body);
      sendSessionResponse(req, res, session, 201);
    } catch (error) {
      next(error);
    }
  };

  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      assertCsrfOrigin(req);
      const session = await this.authService.login(req.body, getClientKey(req));
      sendSessionResponse(req, res, session);
    } catch (error) {
      next(error);
    }
  };

  refresh = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      assertCsrfOrigin(req);
      const refreshCookies = parseCookieHeaderValues(
        req.header('cookie'),
        REFRESH_COOKIE_NAME
      );
      let session: IssuedAuthSession | undefined;
      let graceError: RefreshGraceError | undefined;
      for (const token of refreshCookies) {
        try {
          session = await this.authService.refresh(token);
          break;
        } catch (error) {
          if (!(error instanceof AppError) || error.statusCode !== 401) throw error;
          if (error instanceof RefreshGraceError) {
            graceError = error;
          }
        }
      }
      if (!session) {
        throw graceError ?? new AppError(401, 'Session expired. Please sign in again.');
      }
      sendSessionResponse(req, res, session);
    } catch (error) {
      if (
        error instanceof AppError &&
        error.statusCode === 401 &&
        !(error instanceof RefreshGraceError)
      ) {
        clearRefreshCookie(req, res);
      }
      next(error);
    }
  };

  logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      assertCsrfOrigin(req);
      const refreshCookies = parseCookieHeaderValues(
        req.header('cookie'),
        REFRESH_COOKIE_NAME
      );
      const authHeader = req.header('authorization') || '';
      const accessToken = authHeader.startsWith('Bearer ')
        ? authHeader.slice('Bearer '.length).trim()
        : undefined;
      for (const token of refreshCookies) {
        await this.authService.logout(token);
      }
      if (accessToken) {
        await this.authService.logout(undefined, accessToken);
      }
      clearRefreshCookie(req, res);
      res.setHeader('Cache-Control', 'no-store');
      res.json({ ok: true });
    } catch (error) {
      next(error);
    }
  };
}
