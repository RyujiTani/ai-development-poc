import { Contractor } from '@/features/contractor/domain/contractor';

const DB_NAME = 'worker-attendance-db';
const DB_VERSION = 1;

export function getIndexedDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('IndexedDB is not available in SSR'));
      return;
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = request.result;
      if (!db.objectStoreNames.contains('contractors')) {
        db.createObjectStore('contractors', { keyPath: 'contractor_id' });
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

export async function seedInitialData(): Promise<void> {
  try {
    const db = await getIndexedDB();
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction('contractors', 'readwrite');
      const store = tx.objectStore('contractors');
      const countRequest = store.count();

      countRequest.onsuccess = () => {
        if (countRequest.result === 0) {
          const initialContractors: Contractor[] = [
            {
              contractor_id: 'c1b8a9e2-3d4f-5g6h-7i8j-9k0l1m2n3o4p',
              name: 'A建設株式会社',
              status: 'ACTIVE',
              created_at: new Date('2026-04-01T08:00:00Z').toISOString(),
              updated_at: new Date('2026-04-01T08:00:00Z').toISOString()
            },
            {
              contractor_id: 'd2b8a9e2-3d4f-5g6h-7i8j-9k0l1m2n3o4q',
              name: 'B電設株式会社',
              status: 'ACTIVE',
              created_at: new Date('2026-04-02T09:00:00Z').toISOString(),
              updated_at: new Date('2026-04-02T09:00:00Z').toISOString()
            }
          ];
          
          initialContractors.forEach((c) => store.put(c));
          
          tx.oncomplete = () => {
            resolve();
          };
          tx.onerror = () => {
            reject(tx.error);
          };
        } else {
          resolve();
        }
      };

      countRequest.onerror = () => {
        reject(countRequest.error);
      };
    });
  } catch (err) {
    console.error('Seed error:', err);
  }
}