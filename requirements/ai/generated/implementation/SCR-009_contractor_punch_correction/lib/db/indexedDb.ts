import { Worker } from '@/features/worker/domain/worker';

const DB_NAME = 'worker-attendance-system-db';
const DB_VERSION = 1;

export function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('IndexedDB is only available in the browser.'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

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
        store.createIndex('contractor_idx', 'contractor_id', { unique: false });
      }
      if (!db.objectStoreNames.contains('attendance_records')) {
        db.createObjectStore('attendance_records', { keyPath: 'attendance_id' });
      }
      if (!db.objectStoreNames.contains('attendance_corrections')) {
        db.createObjectStore('attendance_corrections', { keyPath: 'correction_id' });
      }
    };
  });
}

export async function seedInitialData() {
  const db = await openDB();

  const checkEmpty = () => {
    return new Promise<boolean>((resolve) => {
      const tx = db.transaction('workers', 'readonly');
      const store = tx.objectStore('workers');
      const countReq = store.count();
      countReq.onsuccess = () => resolve(countReq.result === 0);
      countReq.onerror = () => resolve(false);
    });
  };

  const isDbEmpty = await checkEmpty();
  if (!isDbEmpty) return;

  const tx = db.transaction(['contractors', 'users', 'workers'], 'readwrite');

  const contractorsStore = tx.objectStore('contractors');
  const usersStore = tx.objectStore('users');
  const workersStore = tx.objectStore('workers');

  // Contractors
  contractorsStore.put({
    contractor_id: 'CTR-001',
    name: '株式会社A建設',
    status: 'ACTIVE',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
  contractorsStore.put({
    contractor_id: 'CTR-002',
    name: '有限会社Bプラント',
    status: 'ACTIVE',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  // Users
  usersStore.put({
    user_id: 'USR-001',
    contractor_id: 'CTR-001',
    role: 'CONTRACTOR_MANAGER',
    login_id: 'ctr001',
    password_hash: 'mock_hash',
    display_name: '外注先A管理者',
    status: 'ACTIVE',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  // Workers
  const initialWorkers: Worker[] = [
    {
      worker_id: 'WKR-001',
      contractor_id: 'CTR-001',
      name: '佐藤 健太',
      contact: '090-1111-2222',
      qualifications: ['QUAL_001'],
      trainings: [{ code: 'TRN_001', taken_at: '2025-04-10' }],
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      worker_id: 'WKR-002',
      contractor_id: 'CTR-001',
      name: '鈴木 茂',
      contact: '090-3333-4444',
      qualifications: ['QUAL_002'],
      trainings: [],
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      worker_id: 'WKR-003',
      contractor_id: 'CTR-002',
      name: '高橋 浩二',
      contact: '080-5555-6666',
      qualifications: [],
      trainings: [],
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  for (const worker of initialWorkers) {
    workersStore.put(worker);
  }
}
