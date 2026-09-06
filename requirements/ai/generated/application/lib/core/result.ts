export type Result<T, E = Error> = 
  | { success: true; value: T } 
  | { success: false; error: E };

export class AppError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'AppError';
  }
}