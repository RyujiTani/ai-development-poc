export const logger = {
  info: (event: string, payload: Record<string, unknown> = {}) => {
    const sanitizedPayload = { ...payload };
    delete sanitizedPayload.password;
    delete sanitizedPayload.photoBlob;
    console.log(JSON.stringify({ level: 'INFO', event, payload: sanitizedPayload }));
  },
  warn: (event: string, payload: Record<string, unknown> = {}) => {
    const sanitizedPayload = { ...payload };
    delete sanitizedPayload.password;
    console.warn(JSON.stringify({ level: 'WARN', event, payload: sanitizedPayload }));
  },
  error: (event: string, error: unknown, payload: Record<string, unknown> = {}) => {
    const sanitizedPayload = { ...payload };
    delete sanitizedPayload.password;
    console.error(JSON.stringify({
      level: 'ERROR',
      event,
      error: error instanceof Error ? error.message : String(error),
      payload: sanitizedPayload
    }));
  }
};