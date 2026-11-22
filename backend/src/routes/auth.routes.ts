import { Router, type RequestHandler } from 'express';
import type { DatabaseState } from '../config/database';
import {
  AuthPasswordController,
  AuthSessionController,
  AuthStatusController,
} from '../controllers/auth';
import { createRequireAuth } from '../middleware/auth.middleware';
import type { AuthService } from '../services/auth';

export function createAuthRouter(
  authService: AuthService,
  options?: {
    ensureDatabase?: () => Promise<DatabaseState>;
    requireDatabase?: RequestHandler;
  }
): Router {
  const router = Router();
  const statusController = new AuthStatusController(authService, options?.ensureDatabase);
  const sessionController = new AuthSessionController(authService);
  const passwordController = new AuthPasswordController(authService);
  const requireAuth = createRequireAuth(authService);
  const dbGuard: RequestHandler =
    options?.requireDatabase ?? ((_req, _res, next) => next());

  // /status always responds 200 with databaseConnected flag for clean client boot
  router.get('/status', statusController.getStatus);

  // All auth mutations and session checks require active MongoDB connection
  router.post('/setup', dbGuard, sessionController.setup);
  router.post('/login', dbGuard, sessionController.login);
  router.post('/refresh', dbGuard, sessionController.refresh);
  router.post('/logout', dbGuard, sessionController.logout);
  router.patch('/password', dbGuard, requireAuth, passwordController.changePassword);
  router.get('/me', dbGuard, requireAuth, statusController.getMe);

  return router;
}
