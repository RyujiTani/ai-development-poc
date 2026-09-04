import { User } from '@/features/user/domain/user';

export const SEED_USERS: User[] = [
  {
    user_id: 'user-contractor-1',
    contractor_id: 'contractor-1',
    role: 'CONTRACTOR_MANAGER',
    login_id: 'contractor1',
    password_hash: 'password123',
    display_name: '外注先A職長',
    status: 'ACTIVE',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    user_id: 'user-factory-1',
    contractor_id: null,
    role: 'FACTORY_ADMIN',
    login_id: 'factory1',
    password_hash: 'password123',
    display_name: '工場管理者A',
    status: 'ACTIVE',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
];

export async function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('Browser environment required'));
      return;
    }
    const request = indexedDB.open('worker-attendance-system', 1);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('users')) {
        db.createObjectStore('users', { keyPath: 'user_id' });
      }
      if (!db.objectStoreNames.contains('audit_logs')) {
        db.createObjectStore('audit_logs', { keyPath: 'audit_id' });
      }
    };

    request.onsuccess = () => {
      const db = request.result;
      
      // 初回シードデータの投入
      try {
        const tx = db.transaction('users', 'readwrite');
        const store = tx.objectStore('users');
        const countRequest = store.count();
        
        countRequest.onsuccess = () => {
          if (countRequest.result === 0) {
            SEED_USERS.forEach((user) => {
              store.put(user);
            });
          }
        };
      } catch (err) {
        console.error('Failed to auto-seed database:', err);
      }
      
      resolve(db);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}