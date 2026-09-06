type LogLevel = 'info' | 'warn' | 'error';

interface LogPayload {
  level: LogLevel;
  event: string;
  payload?: Record<string, any>;
}

export const logger = {
  log(level: LogLevel, event: string, payload?: Record<string, any>) {
    const sanitizedPayload = payload ? { ...payload } : undefined;
    if (sanitizedPayload) {
      const forbiddenKeys = ['password', 'password_plain', 'password_hash', 'blob', 'photo', 'name', 'contact', 'display_name'];
      for (const key of forbiddenKeys) {
        if (key in sanitizedPayload) {
          sanitizedPayload[key] = '[REDACTED]';
        }
      }
    }

    const logEntry: LogPayload = {
      level,
      event,
      payload: sanitizedPayload,
    };

    console.log(JSON.stringify(logEntry));
  },
  info(event: string, payload?: Record<string, any>) {
    this.log('info', event, payload);
  },
  warn(event: string, payload?: Record<string, any>) {
    this.log('warn', event, payload);
  },
  error(event: string, payload?: Record<string, any>) {
    this.log('error', event, payload);
  }
};