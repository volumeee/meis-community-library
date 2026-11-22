import { Router } from 'express';
import { LendingsController } from '../controllers/lendings/lendings.controller';
import type { LendingsService } from '../services/lendings/lendings.service';

export function createLendingsRouter(service: LendingsService): Router {
  const router = Router();
  const controller = new LendingsController(service);

  router.get('/lendings', controller.getLendings);
  router.post('/lendings/preview', controller.previewLending);
  router.post('/lendings', controller.createLending);
  router.patch('/lendings/:id/return', controller.returnLending);

  return router;
}
