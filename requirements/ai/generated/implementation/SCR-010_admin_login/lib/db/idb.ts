import { User } from '@/features/user/domain/user';

const DB_NAME = 'worker-attendance-db';
const DB_VERSION = 1;

export function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('IndexedDB is not available on server-side'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = request.result;
      if (!db.objectStoreNames.contains('users')) {
        db.createObjectStore('users', { keyPath: 'user_id' });
      }
    };
  });
}

export async function seedDatabase(): Promise<void> {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(['users'], 'readwrite');
    const store = transaction.objectStore('users');

    const seedUsers: User[] = [
      {
        user_id: 'factory-admin-1',
        contractor_id: null,
        role: 'FACTORY_ADMIN',
        login_id: 'admin',
        password_hash: 'admin123',
        display_name: '工場側管理者A',
        status: 'ACTIVE',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        user_id: 'contractor-manager-1',
        contractor_id: 'contractor-1',
        role: 'CONTRACTOR_MANAGER',
        login_id: 'contractor',
        password_hash: 'contractor123',
        display_name: '外注先管理者A',
        status: 'ACTIVE',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];

    const countRequest = store.count();
    countRequest.onsuccess = () => {
      if (countRequest.result === 0) {
        seedUsers.forEach((user) => {
          store.put(user);
        });
      }
    };

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}