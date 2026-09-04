export const logger = {
  info: (event: string, payload?: Record<string, unknown>) => {
    console.log(JSON.stringify({ level: 'INFO', event, payload }));
  },
  error: (event: string, payload?: Record<string, unknown>) => {
    console.error(JSON.stringify({ level: 'ERROR', event, payload }));
  }
};