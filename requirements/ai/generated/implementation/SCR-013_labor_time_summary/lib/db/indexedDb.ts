export const DB_NAME = 'worker_attendance_db';
export const DB_VERSION = 1;

export function getDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('IndexedDB is not available on server-side'));
      return;
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

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
        workerStore.createIndex('by-contractor', 'contractor_id', { unique: false });
      }
      if (!db.objectStoreNames.contains('attendance_records')) {
        const attendanceStore = db.createObjectStore('attendance_records', { keyPath: 'attendance_id' });
        attendanceStore.createIndex('by-worker', 'worker_id', { unique: false });
      }
    };
  });
}
"
    },
    {