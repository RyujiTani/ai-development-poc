interface LogPayload {
  event: string;
  level: 'info' | 'warn' | 'error';
  payload?: Record<string, unknown>;
}

export const logger = {
  log({ event, level, payload }: LogPayload) {
    const safePayload = payload ? { ...payload } : {};
    if (safePayload.photo_blob) delete safePayload.photo_blob;
    if (safePayload.password) delete safePayload.password;
    if (safePayload.password_hash) delete safePayload.password_hash;

    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      event,
      payload: safePayload
    }));
  },
  info(event: string, payload?: Record<string, unknown>) {
    this.log({ event, level: 'info', payload });
  },
  warn(event: string, payload?: Record<string, unknown>) {
    this.log({ event, level: 'warn', payload });
  },
  error(event: string, payload?: Record<string, unknown>) {
    this.log({ event, level: 'error', payload });
  }
};
"
    },
    {