import { User } from '@/features/user/domain/user';
import { mockHashPassword } from '../auth/hash';
import { logger } from '../logger/logger';

const DB_NAME = 'worker_attendance_system_db';
const DB_VERSION = 1;

// テストやSSR、非互換環境向けのインメモリフォールバック
let inMemoryUsersStore: User[] = [];

// 初期シードデータ
const initialSeedUsers: User[] = [
  {
    user_id: 'factory-admin-1',
    contractor_id: null,
    role: 'FACTORY_ADMIN',
    login_id: 'admin',
    password_hash: mockHashPassword('password123'),
    display_name: '工場側総括管理者',
    status: 'ACTIVE',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
];

export function isIndexedDBAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  return 'indexedDB' in window && window.indexedDB !== undefined;
}

/**
 * データベースの初期化と初期シードデータの投入
 */
export function initDB(): Promise<IDBDatabase | null> {
  if (!isIndexedDBAvailable()) {
    // クライアントサイド以外、またはテスト環境などでIndexedDBがない場合はインメモリにシードを投入
    if (inMemoryUsersStore.length === 0) {
      inMemoryUsersStore = [...initialSeedUsers];
      logger.info('DB_SEED_IN_MEMORY_SUCCESS');
    }
    return Promise.resolve(null);
  }

  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      logger.error('DB_OPEN_FAILED', { error: request.error?.message });
      reject(request.error);
    };

    request.onsuccess = (event) => {
      const db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const db = request.result;
      
      // usersストアの作成
      if (!db.objectStoreNames.contains('users')) {
        const userStore = db.createObjectStore('users', { keyPath: 'user_id' });
        userStore.createIndex('login_id', 'login_id', { unique: true });
        
        // シードデータの自動追加
        userStore.transaction.oncomplete = () => {
          const transaction = db.transaction('users', 'readwrite');
          const store = transaction.objectStore('users');
          initialSeedUsers.forEach((user) => {
            store.put(user);
          });
          logger.info('DB_SEED_INDEXED_DB_SUCCESS');
        };
      }
    };
  });
}

/**
 * モックDBリセット機能（開発ツール・シード再投入用）
 */
export function resetDB(): Promise<void> {
  if (!isIndexedDBAvailable()) {
    inMemoryUsersStore = [...initialSeedUsers];
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const request = window.indexedDB.deleteDatabase(DB_NAME);
    request.onsuccess = () => {
      logger.info('DB_RESET_SUCCESS');
      initDB().then(() => resolve()).catch(reject);
    };
    request.onerror = () => {
      logger.error('DB_RESET_FAILED');
      reject(request.error);
    };
  });
}

/**
 * Usersストア用のデータアクセスメソッド
 */
export const dbUsers = {
  async findByLoginId(loginId: string): Promise<User | null> {
    if (!isIndexedDBAvailable()) {
      const user = inMemoryUsersStore.find(u => u.login_id === loginId);
      return user || null;
    }

    const db = await initDB();
    if (!db) return null;

    return new Promise((resolve, reject) => {
      const transaction = db.transaction('users', 'readonly');
      const store = transaction.objectStore('users');
      const index = store.index('login_id');
      const request = index.get(loginId);

      request.onsuccess = () => {
        resolve(request.result || null);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  },

  async save(user: User): Promise<void> {
    if (!isIndexedDBAvailable()) {
      const index = inMemoryUsersStore.findIndex(u => u.user_id === user.user_id);
      if (index !== -1) {
        inMemoryUsersStore[index] = user;
      } else {
        inMemoryUsersStore.push(user);
      }
      return Promise.resolve();
    }

    const db = await initDB();
    if (!db) return;

    return new Promise((resolve, reject) => {
      const transaction = db.transaction('users', 'readwrite');
      const store = transaction.objectStore('users');
      const request = store.put(user);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }
};