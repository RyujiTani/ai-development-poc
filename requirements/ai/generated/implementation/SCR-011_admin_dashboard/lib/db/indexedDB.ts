import { User } from '@/features/user/domain/user';
import { Worker, AttendanceRecord, Contractor } from '@/features/attendance/domain/attendance';

const DB_NAME = 'worker_attendance_db';
const DB_VERSION = 1;

export function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('IndexedDB is only available in browser'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
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
        const attendanceStore = db.createObjectStore('attendance_records', { keyPath: 'attendance_id' });
        attendanceStore.createIndex('worker_id', 'worker_id', { unique: false });
        attendanceStore.createIndex('contractor_id', 'contractor_id', { unique: false });
      }
      if (!db.objectStoreNames.contains('audit_logs')) {
        db.createObjectStore('audit_logs', { keyPath: 'audit_id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function clearAllData(): Promise<void> {
  const db = await openDB();
  const stores = ['contractors', 'users', 'workers', 'attendance_records', 'audit_logs'];
  const tx = db.transaction(stores, 'readwrite');
  stores.forEach(storeName => {
    tx.objectStore(storeName).clear();
  });
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function seedDatabase(): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(['contractors', 'users', 'workers', 'attendance_records'], 'readwrite');

  const contractors: Contractor[] = [
    { contractor_id: 'c-001', name: '鈴木工業', status: 'ACTIVE', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { contractor_id: 'c-002', name: '佐藤建設', status: 'ACTIVE', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
  ];

  const users: User[] = [
    { 
      user_id: 'u-001', 
      contractor_id: null, 
      role: 'FACTORY_ADMIN', 
      login_id: 'admin', 
      password_hash: 'admin123', 
      display_name: '工場管理者 鈴木', 
      status: 'ACTIVE', 
      created_at: new Date().toISOString(), 
      updated_at: new Date().toISOString() 
    },
    { 
      user_id: 'u-002', 
      contractor_id: 'c-001', 
      role: 'CONTRACTOR_MANAGER', 
      login_id: 'sub1', 
      password_hash: 'sub123', 
      display_name: '鈴木工業 管理者', 
      status: 'ACTIVE', 
      created_at: new Date().toISOString(), 
      updated_at: new Date().toISOString() 
    }
  ];

  const workers: Worker[] = [
    { worker_id: 'w-001', contractor_id: 'c-001', name: '山田 太郎', qualifications: ['QUAL-001'], trainings: [], status: 'ACTIVE', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { worker_id: 'w-002', contractor_id: 'c-001', name: '田中 次郎', qualifications: [], trainings: [], status: 'ACTIVE', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { worker_id: 'w-003', contractor_id: 'c-001', name: '佐藤 三郎', qualifications: ['QUAL-002'], trainings: [], status: 'ACTIVE', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { worker_id: 'w-004', contractor_id: 'c-002', name: '渡辺 一郎', qualifications: [], trainings: [], status: 'ACTIVE', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { worker_id: 'w-005', contractor_id: 'c-002', name: '高橋 二郎', qualifications: ['QUAL-001', 'QUAL-002'], trainings: [], status: 'ACTIVE', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
  ];

  const todayStr = new Date().toISOString().split('T')[0];
  const attendanceRecords: AttendanceRecord[] = [
    {
      attendance_id: 'a-001',
      worker_id: 'w-001',
      contractor_id: 'c-001',
      punch_type: 'CLOCK_IN',
      clocked_at: `${todayStr}T08:00:00Z`,
      punched_by: 'u-002',
      photo_object_id: 'dummy-photo-1',
      created_at: `${todayStr}T08:00:00Z`
    },
    {
      attendance_id: 'a-002',
      worker_id: 'w-002',
      contractor_id: 'c-001',
      punch_type: 'CLOCK_IN',
      clocked_at: `${todayStr}T08:15:00Z`,
      punched_by: 'u-002',
      photo_object_id: 'dummy-photo-2',
      created_at: `${todayStr}T08:15:00Z`
    },
    {
      attendance_id: 'a-003',
      worker_id: 'w-004',
      contractor_id: 'c-002',
      punch_type: 'CLOCK_IN',
      clocked_at: `${todayStr}T08:30:00Z`,
      punched_by: 'u-001',
      photo_object_id: 'dummy-photo-3',
      created_at: `${todayStr}T08:30:00Z`
    },
    {
      attendance_id: 'a-004',
      worker_id: 'w-004',
      contractor_id: 'c-002',
      punch_type: 'CLOCK_OUT',
      clocked_at: `${todayStr}T12:00:00Z`,
      punched_by: 'u-001',
      photo_object_id: 'dummy-photo-4',
      created_at: `${todayStr}T12:00:00Z`
    }
  ];

  contractors.forEach(c => tx.objectStore('contractors').put(c));
  users.forEach(u => tx.objectStore('users').put(u));
  workers.forEach(w => tx.objectStore('workers').put(w));
  attendanceRecords.forEach(ar => tx.objectStore('attendance_records').put(ar));

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function checkAndSeed(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('users', 'readonly');
    const store = tx.objectStore('users');
    const request = store.getAll();
    request.onsuccess = async () => {
      if (request.result.length === 0) {
        await seedDatabase();
      }
      resolve();
    };
    request.onerror = () => reject(request.error);
  });
}
"
    },
    {