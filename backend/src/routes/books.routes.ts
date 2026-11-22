import { Router } from 'express';
import { BooksController } from '../controllers/books/books.controller';
import type { BooksService } from '../services/books/books.service';

export function createBooksRouter(service: BooksService): Router {
  const router = Router();
  const controller = new BooksController(service);

  router.get('/genres', controller.getGenres);

  router.get('/books', controller.getBooks);
  router.get('/books/:id', controller.getBookById);
  router.post('/books', controller.createBook);
  router.patch('/books/:id', controller.updateBook);
  router.delete('/books/:id', controller.deleteBook);

  return router;
}
