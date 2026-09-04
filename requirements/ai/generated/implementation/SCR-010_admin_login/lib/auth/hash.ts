/**
 * モック認証用の簡易パスワードハッシュ関数
 * （本番用ハッシュ関数は非ゴールとし、平文保存を避けるための簡易実装）
 */
export function mockHashPassword(password: string): string {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // 32ビット整数に変換
  }
  return `mock_hash_${hash}`;
}