type LogLevel = 'INFO' | 'WARN' | 'ERROR';

export const logger = {
  log(level: LogLevel, event: string, payload?: Record<string, unknown>) {
    const sanitizedPayload = payload ? { ...payload } : undefined;
    if (sanitizedPayload) {
      if ('password' in sanitizedPayload) {
        sanitizedPayload.password = '********';
      }
      if ('password_hash' in sanitizedPayload) {
        sanitizedPayload.password_hash = '********';
      }
    }
    console.log(JSON.stringify({ level, event, payload: sanitizedPayload }));
  },
  info(event: string, payload?: Record<string, unknown>) {
    this.log('INFO', event, payload);
  },
  warn(event: string, payload?: Record<string, unknown>) {
    this.log('WARN', event, payload);
  },
  error(event: string, payload?: Record<string, unknown>) {
    this.log('ERROR', event, payload);
  }
};