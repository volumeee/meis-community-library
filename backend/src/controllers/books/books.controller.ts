import type { NextFunction, Request, Response } from 'express';
import type { BooksService } from '../../services/books/books.service';

export class BooksController {
  constructor(private readonly service: BooksService) {}

  getGenres = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const genres = await this.service.listGenres();
      res.json({ genres });
    } catch (error) {
      next(error);
    }
  };

  getBooks = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const books = await this.service.listBooks(req.query as Record<string, unknown>);
      res.json({ books });
    } catch (error) {
      next(error);
    }
  };

  getBookById = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const book = await this.service.getBookById(req.params.id);
      res.json({ book });
    } catch (error) {
      next(error);
    }
  };

  createBook = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const book = await this.service.addBook(req.body);
      res.status(201).json({ book });
    } catch (error) {
      next(error);
    }
  };

  updateBook = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const book = await this.service.updateBook(req.params.id, req.body);
      res.json({ book });
    } catch (error) {
      next(error);
    }
  };

  deleteBook = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.service.removeBook(req.params.id);
      res.status(200).json({ deleted: true, id: req.params.id });
    } catch (error) {
      next(error);
    }
  };
}
