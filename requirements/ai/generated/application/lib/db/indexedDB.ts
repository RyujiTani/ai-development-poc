import { logger } from '../logger/logger';

const DB_NAME = 'worker_attendance_db';
const DB_VERSION = 1;

export function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('IndexedDB is not available on server-side'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('users')) {
        db.createObjectStore('users', { keyPath: 'user_id' });
      }
      if (!db.objectStoreNames.contains('contractors')) {
        db.createObjectStore('contractors', { keyPath: 'contractor_id' });
      }
      if (!db.objectStoreNames.contains('workers')) {
        db.createObjectStore('workers', { keyPath: 'worker_id' });
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

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      logger.error('failed_to_open_db', request.error);
      reject(request.error);
    };
  });
}

export async function initializeDBWithSeed(): Promise<void> {
  const db = await openDB();
  
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction('users', 'readonly');
    const store = tx.objectStore('users');
    const countRequest = store.count();

    countRequest.onsuccess = async () => {
      if (countRequest.result === 0) {
        logger.info('seeding_database_start');
        try {
          const res = await fetch('/mocks/seed.json');
          if (!res.ok) {
            throw new Error('failed to fetch seed.json');
          }
          const seedData = await res.json();

          const writeTx = db.transaction(['users', 'contractors', 'workers'], 'readwrite');
          
          const userStore = writeTx.objectStore('users');
          for (const user of seedData.users) {
            userStore.put(user);
          }

          const contractorStore = writeTx.objectStore('contractors');
          for (const contractor of seedData.contractors) {
            contractorStore.put(contractor);
          }

          if (seedData.workers) {
            const workerStore = writeTx.objectStore('workers');
            for (const worker of seedData.workers) {
              workerStore.put(worker);
            }
          }

          writeTx.oncomplete = () => {
            logger.info('seeding_database_success');
            resolve();
          };

          writeTx.onerror = () => {
            logger.error('seeding_database_failed', writeTx.error);
            reject(writeTx.error);
          };
        } catch (error) {
          logger.error('seeding_failed', error);
          reject(error);
        }
      } else {
        resolve();
      }
    };

    countRequest.onerror = () => {
      logger.error('count_check_failed', countRequest.error);
      reject(countRequest.error);
    };
  });
}