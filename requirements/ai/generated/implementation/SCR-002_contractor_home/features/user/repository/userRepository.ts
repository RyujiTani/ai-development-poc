import { User, Result } from '../domain/user';
import { openDatabase } from '@/lib/db/indexedDB';

export interface UserRepository {
  getUserById(userId: string): Promise<Result<User>>;
}

export class IndexedDBUserRepository implements UserRepository {
  async getUserById(userId: string): Promise<Result<User>> {
    try {
      const db = await openDatabase();
      return new Promise((resolve) => {
        const transaction = db.transaction(['users'], 'readonly');
        const store = transaction.objectStore('users');
        const request = store.get(userId);

        request.onsuccess = () => {
          const user = request.result as User | undefined;
          if (user) {
            resolve({ success: true, value: user });
          } else {
            resolve({
              success: false,
              error: { code: 'NOT_FOUND', message: 'ユーザー情報が見つかりません。' }
            });
          }
        };

        request.onerror = () => {
          resolve({
            success: false,
            error: { code: 'DB_ERROR', message: 'データベース操作に失敗しました。' }
          });
        };
      });
    } catch (e: any) {
      return {
        success: false,
        error: { code: 'INIT_ERROR', message: e.message || 'データベースへの接続に失敗しました。' }
      };
    }
  }
}
"
    },
    {