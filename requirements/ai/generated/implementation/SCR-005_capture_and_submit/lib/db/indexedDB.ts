export const DB_NAME = 'worker_attendance_db';
export const DB_VERSION = 1;

export function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('IndexedDB is only available inside browser environment'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

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
        const attendanceStore = db.createObjectStore('attendance_records', { keyPath: 'attendance_id' });
        attendanceStore.createIndex('worker_id', 'worker_id', { unique: false });
        attendanceStore.createIndex('contractor_id', 'contractor_id', { unique: false });
      }
      if (!db.objectStoreNames.contains('photo_blobs')) {
        db.createObjectStore('photo_blobs', { keyPath: 'photo_object_id' });
      }
      if (!db.objectStoreNames.contains('audit_logs')) {
        db.createObjectStore('audit_logs', { keyPath: 'audit_id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
"
    },
    {