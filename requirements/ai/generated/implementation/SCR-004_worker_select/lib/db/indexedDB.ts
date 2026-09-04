import { Worker, Contractor, User } from '@/features/attendance/domain/types';

const DB_NAME = 'worker_attendance_db';
const DB_VERSION = 1;

export function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('IndexedDB is only available in browser'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = () => {
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
    };
  });
}

export async function seedDatabase(): Promise<void> {
  const db = await initDB();
  const tx = db.transaction(['contractors', 'users', 'workers'], 'readwrite');
  
  const contractorsStore = tx.objectStore('contractors');
  const usersStore = tx.objectStore('users');
  const workersStore = tx.objectStore('workers');

  const seedContractors: Contractor[] = [
    {
      contractor_id: 'cont-abc',
      name: '株式会社アイウエオ工業',
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      contractor_id: 'cont-xyz',
      name: 'サンプ建設株式会社',
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  ];

  const seedUsers: User[] = [
    {
      user_id: 'user-manager-1',
      contractor_id: 'cont-abc',
      role: 'CONTRACTOR_MANAGER',
      login_id: 'manager1',
      password_hash: 'dummy',
      display_name: '山田 太郎 (外注管理者)',
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  ];

  const seedWorkers: Worker[] = Array.from({ length: 25 }, (_, i) => ({
    worker_id: `worker-abc-${i + 1}`,
    contractor_id: 'cont-abc',
    name: `外注作業員 A-${i + 1}`,
    contact: `090-0000-${String(i + 1).padStart(4, '0')}`,
    qualifications: i % 3 === 0 ? ['QUAL-001'] : [],
    trainings: [],
    status: 'ACTIVE',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  })).concat(
    Array.from({ length: 5 }, (_, i) => ({
      worker_id: `worker-xyz-${i + 1}`,
      contractor_id: 'cont-xyz',
      name: `他社作業員 X-${i + 1}`,
      contact: '080-1111-2222',
      qualifications: [],
      trainings: [],
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }))
  );

  for (const c of seedContractors) {
    contractorsStore.put(c);
  }
  for (const u of seedUsers) {
    usersStore.put(u);
  }
  for (const w of seedWorkers) {
    workersStore.put(w);
  }

  return new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}