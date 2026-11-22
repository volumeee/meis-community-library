import type { NextFunction, Request, Response } from 'express';
import type { LendingsService } from '../../services/lendings/lendings.service';

export class LendingsController {
  constructor(private readonly service: LendingsService) {}

  getLendings = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const lendings = await this.service.listLendings();
      res.json({ lendings });
    } catch (error) {
      next(error);
    }
  };

  previewLending = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const preview = await this.service.previewLending(req.body);
      res.json({ preview });
    } catch (error) {
      next(error);
    }
  };

  createLending = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const transaction = await this.service.createLending(req.body);
      res.status(201).json({ transaction });
    } catch (error) {
      next(error);
    }
  };

  returnLending = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const transaction = await this.service.returnLending(req.params.id);
      res.json({ transaction });
    } catch (error) {
      next(error);
    }
  };
}
