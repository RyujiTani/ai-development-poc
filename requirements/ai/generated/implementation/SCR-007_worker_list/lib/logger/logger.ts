export const logger = {
  info(event: string, payload?: Record<string, unknown>) {
    console.log(JSON.stringify({ level: 'INFO', event, payload, timestamp: new Date().toISOString() }));
  },
  warn(event: string, payload?: Record<string, unknown>) {
    console.warn(JSON.stringify({ level: 'WARN', event, payload, timestamp: new Date().toISOString() }));
  },
  error(event: string, error?: unknown, payload?: Record<string, unknown>) {
    console.error(
      JSON.stringify({
        level: 'ERROR',
        event,
        error: error instanceof Error ? error.message : String(error),
        payload,
        timestamp: new Date().toISOString()
      })
    );
  }
};
"
    },
    {