import { Worker, Contractor, User } from '@/features/worker/domain/types';

const DB_NAME = 'worker_attendance_db';
const DB_VERSION = 1;

export function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('Browser environment required'));
      return;
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = request.result;
      if (!db.objectStoreNames.contains('contractors')) {
        db.createObjectStore('contractors', { keyPath: 'contractor_id' });
      }
      if (!db.objectStoreNames.contains('users')) {
        db.createObjectStore('users', { keyPath: 'user_id' });
      }
      if (!db.objectStoreNames.contains('workers')) {
        const store = db.createObjectStore('workers', { keyPath: 'worker_id' });
        store.createIndex('contractor_id', 'contractor_id', { unique: false });
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

const SEED_CONTRACTORS: Contractor[] = [
  {
    contractor_id: 'c1',
    name: '株式会社 A建設',
    status: 'ACTIVE',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    contractor_id: 'c2',
    name: 'B電設 株式会社',
    status: 'ACTIVE',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

const SEED_USERS: User[] = [
  {
    user_id: 'u1',
    contractor_id: 'c1',
    role: 'CONTRACTOR_MANAGER',
    login_id: 'manager1',
    password_hash: 'hash',
    display_name: 'A建設 管理者',
    status: 'ACTIVE',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    user_id: 'u2',
    contractor_id: 'c2',
    role: 'CONTRACTOR_MANAGER',
    login_id: 'manager2',
    password_hash: 'hash',
    display_name: 'B電設 管理者',
    status: 'ACTIVE',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

const SEED_WORKERS: Worker[] = [
  {
    worker_id: 'w1',
    contractor_id: 'c1',
    name: '田中 太郎',
    contact: '090-1111-2222',
    qualifications: ['QUAL_01', 'QUAL_02'],
    trainings: [{ code: 'TR_01', taken_at: '2025-04-10' }],
    status: 'ACTIVE',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    worker_id: 'w2',
    contractor_id: 'c1',
    name: '鈴木 一郎',
    contact: '090-3333-4444',
    qualifications: ['QUAL_01'],
    trainings: [],
    status: 'ACTIVE',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    worker_id: 'w3',
    contractor_id: 'c1',
    name: '佐藤 次郎',
    contact: '080-5555-6666',
    qualifications: [],
    trainings: [{ code: 'TR_02', taken_at: '2025-03-15' }],
    status: 'ACTIVE',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    worker_id: 'w4',
    contractor_id: 'c2',
    name: '高橋 花子',
    contact: '070-7777-8888',
    qualifications: ['QUAL_03'],
    trainings: [{ code: 'TR_01', taken_at: '2025-02-20' }],
    status: 'ACTIVE',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

export async function seedIfNeeded(): Promise<void> {
  const db = await initDB();
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(['contractors', 'users', 'workers'], 'readwrite');
    const workerStore = transaction.objectStore('workers');
    const contractorStore = transaction.objectStore('contractors');
    const userStore = transaction.objectStore('users');

    const checkRequest = workerStore.count();
    checkRequest.onsuccess = () => {
      if (checkRequest.result === 0) {
        SEED_CONTRACTORS.forEach(c => contractorStore.put(c));
        SEED_USERS.forEach(u => userStore.put(u));
        SEED_WORKERS.forEach(w => workerStore.put(w));
      }
      resolve();
    };
    checkRequest.onerror = () => {
      reject(checkRequest.error);
    };
  });
}