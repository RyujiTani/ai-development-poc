export type Result<T, E> = 
  | { success: true; value: T }
  | { success: false; error: E };

export class AppError extends Error {
  constructor(public code: string, message: string) {
    super(message);
    this.name = 'AppError';
  }
}
"
    },
    {