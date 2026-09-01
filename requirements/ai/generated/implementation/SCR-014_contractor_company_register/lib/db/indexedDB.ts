import { Contractor } from '@/features/contractor/domain/types';

const DB_NAME = 'worker_attendance_db';
const DB_VERSION = 1;

const SEED_CONTRACTORS: Contractor[] = [
  {
    contractor_id: '1e5c8e31-5079-40e1-a02b-8a8b16df8d01',
    name: '大和建設株式会社',
    status: 'ACTIVE',
    created_at: '2026-04-10T08:00:00+09:00',
    updated_at: '2026-04-10T08:00:00+09:00'
  },
  {
    contractor_id: '2f5c8e31-5079-40e1-a02b-8a8b16df8d02',
    name: '東洋設備サービス',
    status: 'ACTIVE',
    created_at: '2026-04-11T09:30:00+09:00',
    updated_at: '2026-04-11T09:30:00+09:00'
  },
  {
    contractor_id: '3a5c8e31-5079-40e1-a02b-8a8b16df8d03',
    name: '西日本テックマシナリー',
    status: 'INACTIVE',
    created_at: '2026-04-12T11:00:00+09:00',
    updated_at: '2026-04-12T11:00:00+09:00'
  },
  {
    contractor_id: '4b5c8e31-5079-40e1-a02b-8a8b16df8d04',
    name: '神田電工グループ',
    status: 'ACTIVE',
    created_at: '2026-04-13T10:00:00+09:00',
    updated_at: '2026-04-13T10:00:00+09:00'
  }
];

export function initializeDB(): Promise<IDBDatabase> { 
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('IndexedDB is not supported on Server-side'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = async () => {
      const db = request.result;
      try {
        await seedIfEmpty(db);
        resolve(db);
      } catch (err) {
        reject(err);
      }
    };

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('contractors')) {
        db.createObjectStore('contractors', { keyPath: 'contractor_id' });
      }
    };
  });
}

function seedIfEmpty(db: IDBDatabase): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['contractors'], 'readwrite');
    const store = tx.objectStore('contractors');
    const countReq = store.count();

    countReq.onsuccess = () => {
      if (countReq.result === 0) {
        SEED_CONTRACTORS.forEach((c) => store.put(c));
      }
      resolve();
    };
    countReq.onerror = () => reject(countReq.error);
  });
}

export function resetDB(): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction(['contractors'], 'readwrite');
      const store = tx.objectStore('contractors');
      const clearReq = store.clear();

      clearReq.onsuccess = () => {
        let count = 0;
        SEED_CONTRACTORS.forEach((c) => {
          const addReq = store.put(c);
          addReq.onsuccess = () => {
            count++;
            if (count === SEED_CONTRACTORS.length) {
              resolve();
            }
          };
          addReq.onerror = () => reject(addReq.error);
        });
      };
      clearReq.onerror = () => reject(clearReq.error);
    };
    request.onerror = () => reject(request.error);
  });
}
"
    },
    {