import { User } from '@/features/user/domain/types';

// テスト・ブラウザ双方で一貫して動作する簡易ハッシュ関数（平文保存回避のため）
export function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return 'hash_' + Math.abs(hash).toString(16);
}

const DB_NAME = 'worker-attendance-system-db';
const DB_VERSION = 1;

export function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('IndexedDB is only available in browser environment'));
      return;
    }
    
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = () => {
      const db = request.result;

      // 各オブジェクトストアを作成（存在しない場合のみ）
      if (!db.objectStoreNames.contains('users')) {
        db.createObjectStore('users', { keyPath: 'user_id' });
      }
      if (!db.objectStoreNames.contains('contractors')) {
        db.createObjectStore('contractors', { keyPath: 'contractor_id' });
      }
      if (!db.objectStoreNames.contains('workers')) {
        db.createObjectStore('workers', { keyPath: 'worker_id' });
      }
      if (!db.objectStoreNames.contains('attendance_records')) {
        db.createObjectStore('attendance_records', { keyPath: 'attendance_id' });
      }
      if (!db.objectStoreNames.contains('attendance_corrections')) {
        db.createObjectStore('attendance_corrections', { keyPath: 'correction_id' });
      }
      if (!db.objectStoreNames.contains('photo_blobs')) {
        db.createObjectStore('photo_blobs', { keyPath: 'photo_object_id' });
      }
      if (!db.objectStoreNames.contains('audit_logs')) {
        db.createObjectStore('audit_logs', { keyPath: 'audit_id' });
      }

      // 初期シードデータ投入用トランザクション
      const transaction = request.transaction!;
      const userStore = transaction.objectStore('users');

      const seedUsers: User[] = [
        {
          user_id: 'factory-admin-01',
          contractor_id: null,
          role: 'FACTORY_ADMIN',
          login_id: 'admin',
          password_hash: simpleHash('admin123'),
          display_name: '工場側管理者（テスト）',
          status: 'ACTIVE',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          user_id: 'contractor-manager-01',
          contractor_id: 'contractor-uuid-1',
          role: 'CONTRACTOR_MANAGER',
          login_id: 'subcon',
          password_hash: simpleHash('subcon123'),
          display_name: '外注先管理者（テスト）',
          status: 'ACTIVE',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];

      seedUsers.forEach(u => userStore.put(u));
    };
  });
}
"
    },
    {