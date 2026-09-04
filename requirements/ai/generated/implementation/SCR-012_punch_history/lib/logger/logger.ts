type LogLevel = 'info' | 'warn' | 'error';

interface LogPayload {
  level: LogLevel;
  event: string;
  payload: Record<string, any>;
}

export const logger = {
  log(level: LogLevel, event: string, payload: Record<string, any> = {}) {
    // 個人情報・パスワード・写真Blobはログへの直接出力を禁止（ID等のみ）
    const safePayload = { ...payload };
    delete safePayload.password;
    delete safePayload.password_hash;
    delete safePayload.blob;
    delete safePayload.photo;
    delete safePayload.name;
    delete safePayload.display_name;

    const logMessage: LogPayload = {
      level,
      event,
      payload: safePayload,
    };

    console.log(JSON.stringify(logMessage));
  },

  info(event: string, payload: Record<string, any> = {}) {
    this.log('info', event, payload);
  },

  warn(event: string, payload: Record<string, any> = {}) {
    this.log('warn', event, payload);
  },

  error(event: string, payload: Record<string, any> = {}) {
    this.log('error', event, payload);
  },
};