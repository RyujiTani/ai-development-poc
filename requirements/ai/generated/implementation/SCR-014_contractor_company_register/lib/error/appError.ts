export interface AppError {
  code: string;
  message: string;
}

export type Result<T, E = AppError> = 
  | { success: true; value: T }
  | { success: false; error: E };