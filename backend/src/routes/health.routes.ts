import { Router } from 'express';
import {
  createHealthController,
  type HealthControllerOptions,
} from '../controllers/health.controller';
import type { LibraryService } from '../services/library.service';

export function createHealthRouter(
  service: LibraryService,
  options?: HealthControllerOptions
): Router {
  const router = Router();
  const controller = createHealthController(service, options);

  // Public health probe showing real MongoDB connection status (never exposes secrets)
  router.get('/health', controller.getHealth);

  return router;
}
