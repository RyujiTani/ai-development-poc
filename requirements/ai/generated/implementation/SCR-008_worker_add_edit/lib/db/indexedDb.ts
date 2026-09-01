export const DB_NAME = 'worker-attendance-db';
export const DB_VERSION = 1;

export function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('IndexedDB is only available in browser environments.'));
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
      if (!db.objectStoreNames.contains('attendance_records')) {
        db.createObjectStore('attendance_records', { keyPath: 'attendance_id' });
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

export async function initializeSeedData(): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['contractors', 'users', 'workers'], 'readwrite');
    const contractorStore = tx.objectStore('contractors');
    const userStore = tx.objectStore('users');
    const workerStore = tx.objectStore('workers');

    const countRequest = contractorStore.count();
    countRequest.onsuccess = () => {
      if (countRequest.result === 0) {
        const contractorId = 'c1111111-1111-1111-1111-111111111111';
        
        contractorStore.add({
          contractor_id: contractorId,
          name: '株式会社外注A',
          status: 'ACTIVE',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

        userStore.add({
          user_id: 'u1111111-1111-1111-1111-111111111111',
          contractor_id: contractorId,
          role: 'CONTRACTOR_MANAGER',
          login_id: 'subcon_manager',
          password_hash: 'mock_hash',
          display_name: '外注先 管理者A',
          status: 'ACTIVE',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

        workerStore.add({
          worker_id: 'worker-123',
          contractor_id: contractorId,
          name: 'テスト 太郎',
          contact: '090-1234-5678',
          qualifications: ['QUAL_001', 'QUAL_002'],
          trainings: [
            { code: 'TRAIN_001', taken_at: '2025-04-10' }
          ],
          status: 'ACTIVE',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      }
      resolve();
    };
    countRequest.onerror = () => reject(countRequest.error);
  });
}
"
    },
    {