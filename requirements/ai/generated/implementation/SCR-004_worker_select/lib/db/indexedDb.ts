import { Worker, User } from '@/features/worker/domain/worker';

const DB_NAME = 'worker-attendance-db';
const DB_VERSION = 1;

export function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('IndexedDB is only available in the browser'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('workers')) {
        db.createObjectStore('workers', { keyPath: 'worker_id' });
      }
      if (!db.objectStoreNames.contains('users')) {
        db.createObjectStore('users', { keyPath: 'user_id' });
      }
    };
  });
}

export async function seedDatabase() {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(['workers', 'users'], 'readwrite');
    const workerStore = transaction.objectStore('workers');
    const userStore = transaction.objectStore('users');

    const mockUsers: User[] = [
      {
        user_id: 'USR-001',
        contractor_id: 'CON-001',
        role: 'CONTRACTOR_MANAGER',
        login_id: 'contractor_a',
        password_hash: 'mock_hash',
        display_name: '外注先A管理者',
        status: 'ACTIVE',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    const mockWorkers: Worker[] = [
      {
        worker_id: 'WKR-001',
        contractor_id: 'CON-001',
        name: '山田 太郎',
        contact: '090-1234-5678',
        qualifications: ['QUAL-001'],
        trainings: [],
        status: 'ACTIVE',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        worker_id: 'WKR-002',
        contractor_id: 'CON-001',
        name: '佐藤 次郎',
        contact: '090-8765-4321',
        qualifications: [],
        trainings: [],
        status: 'ACTIVE',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        worker_id: 'WKR-003',
        contractor_id: 'CON-002',
        name: '鈴木 花子',
        contact: '090-1111-2222',
        qualifications: [],
        trainings: [],
        status: 'ACTIVE',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    mockUsers.forEach((u) => userStore.put(u));
    mockWorkers.forEach((w) => workerStore.put(w));

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}