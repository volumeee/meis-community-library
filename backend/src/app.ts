import express, { type Express } from 'express';
import { parseTrustedProxies } from './config/trust-proxy';
import {
  apiErrorHandler,
  apiNotFoundHandler,
} from './middleware/error-handler.middleware';
import { securityHeadersMiddleware } from './middleware/security-headers.middleware';
import { createApiRouter, type ApiRouterOptions } from './routes';
import type { AuthService } from './services/auth';
import type { LibraryService } from './services/library.service';
import { getJwtSecret } from './utils/crypto';

export type ApiAppOptions = ApiRouterOptions;

export function createApiApp(
  service: LibraryService,
  authService: AuthService,
  options?: ApiAppOptions
): Express {
  const app = express();
  getJwtSecret();

  const trustedProxies = parseTrustedProxies(process.env.TRUST_PROXY);
  if (trustedProxies) {
    app.set('trust proxy', trustedProxies);
  }

  app.disable('x-powered-by');
  app.use(securityHeadersMiddleware);
  app.use(express.json({ limit: '1mb' }));

  app.use('/api', createApiRouter(service, authService, options));
  app.use('/api', apiNotFoundHandler);
  app.use(apiErrorHandler);

  return app;
}
