export const logger = {
  info: (event: string, payload?: Record<string, unknown>) => {
    // 個人情報・写真Blobは仕様上ログ出力禁止。IDのみを許可
    const safePayload = payload ? { ...payload } : {};
    if ('photo' in safePayload) {
      delete safePayload.photo;
    }
    console.log(
      JSON.stringify({
        level: 'INFO',
        event,
        payload: safePayload,
        timestamp: new Date().toISOString(),
      })
    );
  },
  error: (event: string, error?: unknown, payload?: Record<string, unknown>) => {
    const errorMsg = error instanceof Error ? error.message : String(error);
    const safePayload = payload ? { ...payload } : {};
    if ('photo' in safePayload) {
      delete safePayload.photo;
    }
    console.error(
      JSON.stringify({
        level: 'ERROR',
        event,
        error: errorMsg,
        payload: safePayload,
        timestamp: new Date().toISOString(),
      })
    );
  },
};