export interface LogPayload {
  level: 'INFO' | 'WARN' | 'ERROR';
  event: string;
  payload?: Record<string, unknown>;
  timestamp: string;
}

export const logger = {
  info(event: string, payload?: Record<string, unknown>): void {
    const log: LogPayload = {
      level: 'INFO',
      event,
      payload,
      timestamp: new Date().toISOString(),
    };
    console.log(JSON.stringify(log));
  },

  warn(event: string, payload?: Record<string, unknown>): void {
    const log: LogPayload = {
      level: 'WARN',
      event,
      payload,
      timestamp: new Date().toISOString(),
    };
    console.warn(JSON.stringify(log));
  },

  error(event: string, error: unknown, payload?: Record<string, unknown>): void {
    const log: LogPayload = {
      level: 'ERROR',
      event,
      payload: {
        ...payload,
        error_message: error instanceof Error ? error.message : String(error),
        error_stack: error instanceof Error ? error.stack : undefined,
      },
      timestamp: new Date().toISOString(),
    };
    console.error(JSON.stringify(log));
  },
};