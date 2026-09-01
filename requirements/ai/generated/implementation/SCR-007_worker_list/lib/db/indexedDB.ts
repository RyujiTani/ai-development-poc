const DB_NAME = 'worker_attendance_db';
const DB_VERSION = 1;

export function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('IndexedDB is only available in browser environments.'));
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

export async function seedDatabaseIfEmpty(): Promise<void> {
  const db = await initDB();

  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(['contractors', 'users', 'workers'], 'readwrite');
    const workersStore = transaction.objectStore('workers');
    const countRequest = workersStore.count();

    countRequest.onsuccess = () => {
      if (countRequest.result > 0) {
        resolve();
        return;
      }

      const contractorStore = transaction.objectStore('contractors');
      const userStore = transaction.objectStore('users');

      const contractors = [
        { contractor_id: 'CON-001', name: '大和建設株式会社', status: 'ACTIVE', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { contractor_id: 'CON-002', name: '東洋電設工業', status: 'ACTIVE', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
      ];

      const users = [
        { 
          user_id: 'usr-1', 
          contractor_id: 'CON-001', 
          role: 'CONTRACTOR_MANAGER', 
          login_id: 'yamato_mgr', 
          password_hash: 'yamato123', 
          display_name: '山田 太郎', 
          status: 'ACTIVE', 
          created_at: new Date().toISOString(), 
          updated_at: new Date().toISOString() 
        },
        { 
          user_id: 'usr-2', 
          contractor_id: 'CON-002', 
          role: 'CONTRACTOR_MANAGER', 
          login_id: 'toyo_mgr', 
          password_hash: 'toyo123', 
          display_name: '鈴木 次郎', 
          status: 'ACTIVE', 
          created_at: new Date().toISOString(), 
          updated_at: new Date().toISOString() 
        }
      ];

      const workers = [
        {
          worker_id: 'w-001',
          contractor_id: 'CON-001',
          name: '佐藤 勝',
          contact: '090-1111-2222',
          qualifications: ['QUAL_001', 'QUAL_002'],
          trainings: [{ code: 'TRN_001', taken_at: '2025-04-10' }],
          status: 'ACTIVE',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          worker_id: 'w-002',
          contractor_id: 'CON-001',
          name: '高橋 健二',
          contact: '080-3333-4444',
          qualifications: ['QUAL_001'],
          trainings: [{ code: 'TRN_001', taken_at: '2025-05-12' }, { code: 'TRN_002', taken_at: '2026-01-15' }],
          status: 'ACTIVE',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          worker_id: 'w-003',
          contractor_id: 'CON-001',
          name: '田中 実',
          contact: '070-5555-6666',
          qualifications: ['QUAL_003'],
          trainings: [],
          status: 'ACTIVE',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          worker_id: 'w-004',
          contractor_id: 'CON-002',
          name: '渡辺 誠',
          contact: '090-7777-8888',
          qualifications: ['QUAL_004'],
          trainings: [{ code: 'TRN_002', taken_at: '2025-08-20' }],
          status: 'ACTIVE',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];

      // Generate extra mock workers to verify pagination (26 total for CON-001)
      for (let i = 5; i <= 26; i++) {
        workers.push({
          worker_id: `w-0${i}`,
          contractor_id: 'CON-001',
          name: `テスト作業員 ${i}`,
          contact: `090-0000-00${i.toString().padStart(2, '0')}`,
          qualifications: i % 2 === 0 ? ['QUAL_002'] : [],
          trainings: i % 3 === 0 ? [{ code: 'TRN_001', taken_at: '2026-02-01' }] : [],
          status: 'ACTIVE',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      }

      contractors.forEach(c => contractorStore.put(c));
      users.forEach(u => userStore.put(u));
      workers.forEach(w => workersStore.put(w));
    };

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}
"
    },
    {