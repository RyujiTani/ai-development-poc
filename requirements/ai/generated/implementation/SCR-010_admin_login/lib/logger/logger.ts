export type LogLevel = 'info' | 'warn' | 'error';

export const logger = {
  log(level: LogLevel, event: string, payload?: Record<string, unknown>) {
    // 個人情報・パスワード・写真Blobなどはセキュリティポリシーに則りログ出力から除外する
    const safePayload = payload ? { ...payload } : undefined;
    if (safePayload) {
      delete safePayload.password;
      delete safePayload.password_hash;
      delete safePayload.blob;
      delete safePayload.photo_object_id;
    }
    
    const logData = {
      level,
      event,
      payload: safePayload,
      timestamp: new Date().toISOString(),
    };

    // 本テストプロジェクトではコンソールに構造化出力する
    console.log(JSON.stringify(logData));
  },

  info(event: string, payload?: Record<string, unknown>) {
    this.log('info', event, payload);
  },

  warn(event: string, payload?: Record<string, unknown>) {
    this.log('warn', event, payload);
  },

  error(event: string, payload?: Record<string, unknown>) {
    this.log('error', event, payload);
  }
};