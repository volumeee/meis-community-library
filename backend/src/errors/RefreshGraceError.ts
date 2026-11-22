import { AppError } from './AppError';

export class RefreshGraceError extends AppError {
  public readonly clearCookie = false;

  constructor(message = 'Session was recently refreshed. Please retry.') {
    super(401, message);
    this.name = 'RefreshGraceError';
  }
}
