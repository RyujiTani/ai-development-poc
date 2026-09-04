export const logger = {
  info: (event: string, payload?: Record<string, unknown>) => {
    console.log(JSON.stringify({ level: 'INFO', event, payload, timestamp: new Date().toISOString() }));
  },
  error: (event: string, error: unknown, payload?: Record<string, unknown>) => {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(JSON.stringify({ level: 'ERROR', event, error: errorMessage, payload, timestamp: new Date().toISOString() }));
  }
};