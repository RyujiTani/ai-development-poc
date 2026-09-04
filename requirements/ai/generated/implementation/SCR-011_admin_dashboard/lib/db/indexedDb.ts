export interface Contractor {
  contractor_id: string;
  name: string;
  status: 'ACTIVE' | 'INACTIVE';
  created_at: string;
  updated_at: string;
}

export interface User {
  user_id: string;
  contractor_id: string | null;
  role: 'FACTORY_ADMIN' | 'CONTRACTOR_MANAGER';
  login_id: string;
  password_hash: string;
  display_name: string;
  status: 'ACTIVE' | 'LOCKED' | 'DISABLED';
  created_at: string;
  updated_at: string;
}

export interface Worker {
  worker_id: string;
  contractor_id: string;
  name: string;
  contact?: string;
  qualifications: string[];
  trainings: Array<{ code: string; taken_at: string }>;
  status: 'ACTIVE' | 'RETIRED';
  created_at: string;
  updated_at: string;
}

export interface AttendanceRecord {
  attendance_id: string;
  worker_id: string;
  contractor_id: string;
  punch_type: 'CLOCK_IN' | 'CLOCK_OUT';
  clocked_at: string;
  punched_by: string;
  photo_object_id: string;
  created_at: string;
}

const DB_NAME = 'worker_attendance_system';
const DB_VERSION = 1;

export function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('IndexedDB is only available in the browser.'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = request.result;
      
      if (!db.objectStoreNames.contains('contractors')) {
        db.createObjectStore('contractors', { keyPath: 'contractor_id' });
      }
      if (!db.objectStoreNames.contains('users')) {
        db.createObjectStore('users', { keyPath: 'user_id' });
      }
      if (!db.objectStoreNames.contains('workers')) {
        db.createObjectStore('workers', { keyPath: 'worker_id' });
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
  const tx = db.transaction(['contractors', 'users', 'workers', 'attendance_records'], 'readwrite');

  const contractorStore = tx.objectStore('contractors');
  const userStore = tx.objectStore('users');
  const workerStore = tx.objectStore('workers');
  const attendanceStore = tx.objectStore('attendance_records');

  const countRequest = contractorStore.count();
  
  return new Promise<void>((resolve, reject) => {
    countRequest.onsuccess = () => {
      if (countRequest.result > 0) {
        resolve(); // Already seeded
        return;
      }

      // 1. Seed Contractors
      const contractors: Contractor[] = [
        {
          contractor_id: 'c1',
          name: '外注A社（東日本建設）',
          status: 'ACTIVE',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          contractor_id: 'c2',
          name: '外注B社（西日本プラント）',
          status: 'ACTIVE',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];

      // 2. Seed Users
      const users: User[] = [
        {
          user_id: 'u1',
          contractor_id: null,
          role: 'FACTORY_ADMIN',
          login_id: 'admin',
          password_hash: 'pbkdf2_mock_hash_admin',
          display_name: '工場側総括管理者',
          status: 'ACTIVE',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          user_id: 'u2',
          contractor_id: 'c1',
          role: 'CONTRACTOR_MANAGER',
          login_id: 'manager-a',
          password_hash: 'pbkdf2_mock_hash_manager_a',
          display_name: '外注A社責任者',
          status: 'ACTIVE',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];

      // 3. Seed Workers
      const workers: Worker[] = [
        {
          worker_id: 'w1',
          contractor_id: 'c1',
          name: '佐藤 健太',
          contact: '090-1111-2222',
          qualifications: ['QUAL_01', 'QUAL_02'], // 玉掛け, クレーン
          trainings: [{ code: 'TR_01', taken_at: '2025-04-10' }],
          status: 'ACTIVE',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          worker_id: 'w2',
          contractor_id: 'c1',
          name: '鈴木 茂',
          contact: '090-3333-4444',
          qualifications: [], // 資格なし
          trainings: [],
          status: 'ACTIVE',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          worker_id: 'w3',
          contractor_id: 'c2',
          name: '高橋 浩二',
          contact: '080-5555-6666',
          qualifications: ['QUAL_01'], // 玉掛けのみ
          trainings: [{ code: 'TR_01', taken_at: '2025-05-12' }],
          status: 'ACTIVE',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          worker_id: 'w4',
          contractor_id: 'c2',
          name: '田中 太郎',
          contact: '080-7777-8888',
          qualifications: ['QUAL_03'], // 高所作業
          trainings: [],
          status: 'ACTIVE',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];

      // 4. Seed Attendance Records (Today's mockup)
      const todayStr = new Date().toISOString().split('T')[0];
      const attendanceRecords: AttendanceRecord[] = [
        {
          attendance_id: 'att-001',
          worker_id: 'w1',
          contractor_id: 'c1',
          punch_type: 'CLOCK_IN',
          clocked_at: `${todayStr}T08:02:15+09:00`,
          punched_by: 'u2',
          photo_object_id: 'photo-mock-001',
          created_at: `${todayStr}T08:02:15+09:00`
        },
        {
          attendance_id: 'att-002',
          worker_id: 'w2',
          contractor_id: 'c1',
          punch_type: 'CLOCK_IN',
          clocked_at: `${todayStr}T08:15:30+09:00`,
          punched_by: 'u2',
          photo_object_id: 'photo-mock-002',
          created_at: `${todayStr}T08:15:30+09:00`
        },
        {
          attendance_id: 'att-003',
          worker_id: 'w3',
          contractor_id: 'c2',
          punch_type: 'CLOCK_IN',
          clocked_at: `${todayStr}T07:55:00+09:00`,
          punched_by: 'u1', // Admin proxy punch
          photo_object_id: 'photo-mock-003',
          created_at: `${todayStr}T07:55:00+09:00`
        }
      ];

      // Put into stores
      contractors.forEach(c => contractorStore.put(c));
      users.forEach(u => userStore.put(u));
      workers.forEach(w => workerStore.put(w));
      attendanceRecords.forEach(a => attendanceStore.put(a));

      tx.oncomplete = () => {
        resolve();
      };

      tx.onerror = () => {
        reject(tx.error);
      };
    };

    countRequest.onerror = () => {
      reject(countRequest.error);
    };
  });
}

export function getAllFromStore<T>(storeName: string): Promise<T[]> {
  return openDatabase().then((db) => {
    return new Promise<T[]>((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result as T[]);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  });
}