import { Worker } from '@/features/worker/domain/worker';

const DB_NAME = 'worker_attendance_db';
const DB_VERSION = 1;

const SEED_WORKERS: Worker[] = [
  {
    worker_id: 'W-TEST-999',
    contractor_id: 'C001',
    name: 'テスト 太郎',
    contact: '090-1234-5678',
    qualifications: ['QA01'],
    trainings: [{ code: 'TR01', taken_at: '2026-04-01' }],
    status: 'ACTIVE',
    created_at: '2026-04-13T00:00:00+09:00',
    updated_at: '2026-04-13T00:00:00+09:00',
  }
];

export function getDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('IndexedDB is only available in browser environment'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      
      // シードデータ投入チェック
      const transaction = db.transaction('workers', 'readwrite');
      const store = transaction.objectStore('workers');
      const countRequest = store.count();
      
      countRequest.onsuccess = () => {
        if (countRequest.result === 0) {
          SEED_WORKERS.forEach((worker) => {
            store.add(worker);
          });
        }
      };
      
      resolve(db);
    };

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('workers')) {
        db.createObjectStore('workers', { keyPath: 'worker_id' });
      }
      if (!db.objectStoreNames.contains('contractors')) {
        db.createObjectStore('contractors', { keyPath: 'contractor_id' });
      }
      if (!db.objectStoreNames.contains('users')) {
        db.createObjectStore('users', { keyPath: 'user_id' });
      }
    };
  });
}