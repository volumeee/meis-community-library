import type { RequestHandler } from 'express';
import type { DatabaseState } from '../config/database';
import { AppError } from '../errors';

export function createRequireDatabase(
  ensureDatabase?: () => Promise<DatabaseState>
): RequestHandler {
  return async (_req, _res, next) => {
    if (!ensureDatabase) {
      next();
      return;
    }
    try {
      const state = await ensureDatabase();
      if (!state.connected) {
        next(
          new AppError(
            503,
            process.env.NODE_ENV === 'production'
              ? 'Database service is currently unavailable.'
              : state.lastError ||
                  'MongoDB is not connected. Set MONGODB_URI in your .env file or environment variables.'
          )
        );
        return;
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}
