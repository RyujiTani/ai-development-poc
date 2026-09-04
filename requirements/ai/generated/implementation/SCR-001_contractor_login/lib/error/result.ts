export type AppError = {
  code: 'VALIDATION_ERROR' | 'AUTH_FAILED' | 'SYSTEM_ERROR';
  message: string;
};

export type Result<T, E = AppError> = 
  | { success: true; value: T }
  | { success: false; error: E };