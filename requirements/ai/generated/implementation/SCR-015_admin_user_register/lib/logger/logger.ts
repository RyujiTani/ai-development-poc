export const logger = {
  info: (event: string, payload: Record<string, unknown>) => {
    console.log(
      JSON.stringify({
        level: 'INFO',
        event,
        payload,
        timestamp: new Date().toISOString(),
      })
    );
  },
  error: (event: string, payload: Record<string, unknown>) => {
    console.error(
      JSON.stringify({
        level: 'ERROR',
        event,
        payload,
        timestamp: new Date().toISOString(),
      })
    );
  },
};