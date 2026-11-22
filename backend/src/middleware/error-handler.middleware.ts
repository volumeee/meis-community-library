import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../errors';

export function apiNotFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ error: 'API endpoint not found.' });
}

export function apiErrorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  next: NextFunction
): void {
  if (res.headersSent) {
    next(err);
    return;
  }
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: err.message,
      ...(err.fieldErrors ? { fieldErrors: err.fieldErrors } : {}),
    });
    return;
  }

  if (err && typeof err === 'object' && 'type' in err) {
    switch (err.type) {
      case 'entity.parse.failed':
        res.status(400).json({ error: 'Malformed JSON request body.' });
        return;
      case 'request.aborted':
      case 'request.size.invalid':
        res.status(400).json({ error: 'Invalid request body.' });
        return;
      case 'entity.verify.failed':
        res.status(403).json({ error: 'Request body rejected.' });
        return;
      case 'entity.too.large':
      case 'parameters.too.many':
        res.status(413).json({ error: 'Request body is too large.' });
        return;
      case 'charset.unsupported':
      case 'encoding.unsupported':
        res.status(415).json({ error: 'Unsupported request body encoding.' });
        return;
    }
  }

  console.error('[Library API Error]', err);
  res.status(500).json({ error: 'An unexpected server error occurred.' });
}

export function serverErrorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  next: NextFunction
): void {
  if (res.headersSent) {
    next(err);
    return;
  }
  console.error('[Library Server Error]', err);
  const status =
    typeof err === 'object' &&
    err !== null &&
    'statusCode' in err &&
    typeof err.statusCode === 'number' &&
    err.statusCode >= 400 &&
    err.statusCode < 600
      ? err.statusCode
      : 500;
  res
    .status(status)
    .type('text/plain')
    .send(status === 404 ? 'Not found.' : 'An unexpected server error occurred.');
}
