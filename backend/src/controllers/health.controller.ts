import type { NextFunction, Request, Response } from 'express';
import type { DatabaseState } from '../config/database';
import type { LibraryService } from '../services/library.service';

export interface HealthControllerOptions {
  ensureDatabase?: () => Promise<DatabaseState>;
  getDatabaseState?: () => DatabaseState;
}

export function createHealthController(
  service: LibraryService,
  options?: HealthControllerOptions
) {
  return {
    getHealth: async (
      _req: Request,
      res: Response,
      next: NextFunction
    ): Promise<void> => {
      try {
        res.setHeader('Cache-Control', 'no-store');
        const dbState = options?.ensureDatabase
          ? await options.ensureDatabase()
          : options?.getDatabaseState
            ? options.getDatabaseState()
            : { connected: true, databaseName: null, lastError: null };

        res.status(dbState.connected ? 200 : 503).json({
          status: dbState.connected ? 'ok' : 'degraded',
          service: "Mei's Community Library API",
          storage: service.getStorageEngine(),
          connected: dbState.connected,
          ...(process.env.NODE_ENV !== 'production'
            ? { database: dbState.databaseName }
            : {}),
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        next(error);
      }
    },
  };
}
