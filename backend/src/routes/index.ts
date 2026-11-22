import { Router } from 'express';
import type { DatabaseState } from '../config/database';
import { createRequireAuth } from '../middleware/auth.middleware';
import { createRequireDatabase } from '../middleware/database.middleware';
import { noStoreHeadersMiddleware } from '../middleware/security-headers.middleware';
import type { AuthService } from '../services/auth';
import type { LibraryService } from '../services/library.service';
import { createAuthRouter } from './auth.routes';
import { createBooksRouter } from './books.routes';
import { createHealthRouter } from './health.routes';
import { createLendingsRouter } from './lendings.routes';

export interface ApiRouterOptions {
  ensureDatabase?: () => Promise<DatabaseState>;
  getDatabaseState?: () => DatabaseState;
}

export function createApiRouter(
  service: LibraryService,
  authService: AuthService,
  options?: ApiRouterOptions
): Router {
  const router = Router();
  const requireDatabase = createRequireDatabase(options?.ensureDatabase);
  const requireAuth = createRequireAuth(authService);

  router.use(createHealthRouter(service, options));
  router.use(
    '/auth',
    createAuthRouter(authService, {
      ensureDatabase: options?.ensureDatabase,
      requireDatabase,
    })
  );

  // All catalog & lending routes require MongoDB + valid server-verified JWT
  const protectedLibraryRouter = Router();
  protectedLibraryRouter.use(requireDatabase, requireAuth, noStoreHeadersMiddleware);
  protectedLibraryRouter.use(createBooksRouter(service.books));
  protectedLibraryRouter.use(createLendingsRouter(service.lendings));

  router.use(protectedLibraryRouter);

  return router;
}
