import { Worker, User, Contractor } from '@/features/worker/domain/types';

const DB_NAME = 'worker_attendance_db';
const DB_VERSION = 1;

export function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('IndexedDB is only available in the browser'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = request.result;

      if (!db.objectStoreNames.contains('contractors')) {
        db.createObjectStore('contractors', { keyPath: 'contractor_id' });
      }
      if (!db.objectStoreNames.contains('users')) {
        db.createObjectStore('users', { keyPath: 'user_id' });
      }
      if (!db.objectStoreNames.contains('workers')) {
        const workerStore = db.createObjectStore('workers', { keyPath: 'worker_id' });
        workerStore.createIndex('contractor_id', 'contractor_id', { unique: false });
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
    };
  });
}

export async function seedDatabase(db: IDBDatabase): Promise<void> {
  const transaction = db.transaction(['contractors', 'users', 'workers'], 'readwrite');

  const contractorStore = transaction.objectStore('contractors');
  const userStore = transaction.objectStore('users');
  const workerStore = transaction.objectStore('workers');

  // Check if data already exists
  const countRequest = workerStore.count();
  const count = await new Promise<number>((resolve) => {
    countRequest.onsuccess = () => resolve(countRequest.result);
  });

  if (count > 0) {
    return; // Already seeded
  }

  // Seed Contractors
  const contractors: Contractor[] = [
    {
      contractor_id: 'C001',
      name: '明和建設株式会社',
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      contractor_id: 'C002',
      name: '大原電設工業',
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  // Seed Users
  const users: User[] = [
    {
      user_id: 'U001',
      contractor_id: 'C001',
      role: 'CONTRACTOR_MANAGER',
      login_id: 'meiwa-mgr',
      password_hash: 'password123',
      display_name: '佐藤 健二（明和建設）',
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      user_id: 'U002',
      contractor_id: 'C002',
      role: 'CONTRACTOR_MANAGER',
      login_id: 'ohara-mgr',
      password_hash: 'password123',
      display_name: '高橋 浩（大原電設）',
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      user_id: 'U003',
      contractor_id: null,
      role: 'FACTORY_ADMIN',
      login_id: 'factory-admin',
      password_hash: 'admin123',
      display_name: '鈴木 工場長',
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  // Seed Workers
  const workers: Worker[] = [
    {
      worker_id: 'W001',
      contractor_id: 'C001',
      name: '山田 太郎',
      contact: '090-1111-2222',
      qualifications: ['Q01', 'Q02'],
      trainings: [{ code: 'T01', taken_at: '2026-04-01' }],
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      worker_id: 'W002',
      contractor_id: 'C001',
      name: '佐藤 次郎',
      contact: '080-3333-4444',
      qualifications: ['Q01'],
      trainings: [],
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      worker_id: 'W003',
      contractor_id: 'C001',
      name: '鈴木 三郎',
      contact: '070-5555-6666',
      qualifications: ['Q03', 'Q04'],
      trainings: [{ code: 'T01', taken_at: '2026-04-02' }, { code: 'T02', taken_at: '2026-04-03' }],
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      worker_id: 'W004',
      contractor_id: 'C001',
      name: '渡辺 四郎',
      contact: '090-7777-8888',
      qualifications: [],
      trainings: [],
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      worker_id: 'W005',
      contractor_id: 'C001',
      name: '高橋 五郎',
      contact: '080-9999-0000',
      qualifications: ['Q02'],
      trainings: [{ code: 'T01', taken_at: '2026-04-05' }],
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      worker_id: 'W006',
      contractor_id: 'C001',
      name: '加藤 六郎',
      contact: '070-1234-5678',
      qualifications: ['Q01', 'Q03'],
      trainings: [],
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      worker_id: 'W007',
      contractor_id: 'C002',
      name: '田中 一朗',
      contact: '090-2222-3333',
      qualifications: ['Q03'],
      trainings: [{ code: 'T01', taken_at: '2026-04-02' }],
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      worker_id: 'W008',
      contractor_id: 'C002',
      name: '山本 二郎',
      contact: '080-4444-5555',
      qualifications: [],
      trainings: [],
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  contractors.forEach((c) => contractorStore.put(c));
  users.forEach((u) => userStore.put(u));
  workers.forEach((w) => workerStore.put(w));

  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function getDB(): Promise<IDBDatabase> {
  const db = await initDB();
  await seedDatabase(db);
  return db;
}