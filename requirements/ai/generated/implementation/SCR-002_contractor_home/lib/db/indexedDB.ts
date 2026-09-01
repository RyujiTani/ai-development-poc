import { User } from '@/features/user/domain/user';

const DB_NAME = 'worker_attendance_db';
const DB_VERSION = 1;

export const SEED_USERS: User[] = [
  { 
    user_id: 'usr001',
    contractor_id: 'con001',
    role: 'CONTRACTOR_MANAGER',
    login_id: 'contractor_admin_1',
    password_hash: 'dummy_hash',
    display_name: 'テスト外注先管理者',
    status: 'ACTIVE',
    created_at: '2026-04-13T00:00:00+09:00',
    updated_at: '2026-04-13T00:00:00+09:00'
  }
];

export function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('IndexedDB is not available on server side'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = request.result;
      if (!db.objectStoreNames.contains('users')) {
        db.createObjectStore('users', { keyPath: 'user_id' });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

export async function initializeSeedData(): Promise<void> {
  if (typeof window === 'undefined') return;
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['users'], 'readwrite');
    const store = transaction.objectStore('users');
    
    const countRequest = store.count();
    countRequest.onsuccess = () => {
      if (countRequest.result === 0) {
        SEED_USERS.forEach((user) => {
          store.put(user);
        });
      }
      resolve();
    };
    
    countRequest.onerror = () => reject(countRequest.error);
  });
}
"
    },
    {