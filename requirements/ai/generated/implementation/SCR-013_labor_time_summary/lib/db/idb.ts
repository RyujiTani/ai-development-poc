import { Contractor, User, Worker, AttendanceRecord } from '../../features/attendance/domain/types';

const DB_NAME = 'worker_attendance_db';
const DB_VERSION = 1;

export const SEED_DATA = {
  contractors: [
    { contractor_id: 'c1', name: '大和建設', status: 'ACTIVE', created_at: '2026-04-01T00:00:00Z', updated_at: '2026-04-01T00:00:00Z' },
    { contractor_id: 'c2', name: 'テクノプラント', status: 'ACTIVE', created_at: '2026-04-01T00:00:00Z', updated_at: '2026-04-01T00:00:00Z' }
  ] as Contractor[],
  users: [
    { user_id: 'u1', contractor_id: null, role: 'FACTORY_ADMIN', login_id: 'admin', password_hash: 'adminpass', display_name: '工場管理者 太田', status: 'ACTIVE', created_at: '2026-04-01T00:00:00Z', updated_at: '2026-04-01T00:00:00Z' },
    { user_id: 'u2', contractor_id: 'c1', role: 'CONTRACTOR_MANAGER', login_id: 'contractor1', password_hash: 'contractorpass', display_name: '外注管理者 山田', status: 'ACTIVE', created_at: '2026-04-01T00:00:00Z', updated_at: '2026-04-01T00:00:00Z' }
  ] as User[],
  workers: [
    { worker_id: 'w1', contractor_id: 'c1', name: '佐藤 健太', status: 'ACTIVE', qualifications: ['Q01'], trainings: [], created_at: '2026-04-01T00:00:00Z', updated_at: '2026-04-01T00:00:00Z' },
    { worker_id: 'w2', contractor_id: 'c1', name: '鈴木 一郎', status: 'ACTIVE', qualifications: [], trainings: [], created_at: '2026-04-01T00:00:00Z', updated_at: '2026-04-01T00:00:00Z' },
    { worker_id: 'w3', contractor_id: 'c2', name: '高橋 浩二', status: 'ACTIVE', qualifications: ['Q02'], trainings: [], created_at: '2026-04-01T00:00:00Z', updated_at: '2026-04-01T00:00:00Z' }
  ] as Worker[],
  attendance_records: [
    // w1: 2026-04-13 08:00 - 17:00 (9.0時間)
    { attendance_id: 'a1', worker_id: 'w1', contractor_id: 'c1', punch_type: 'CLOCK_IN', clocked_at: '2026-04-13T08:00:00Z', punched_by: 'u2', photo_object_id: 'p1', created_at: '2026-04-13T08:00:00Z' },
    { attendance_id: 'a2', worker_id: 'w1', contractor_id: 'c1', punch_type: 'CLOCK_OUT', clocked_at: '2026-04-13T17:00:00Z', punched_by: 'u2', photo_object_id: 'p2', created_at: '2026-04-13T17:00:00Z' },
    // w1: 2026-04-14 08:30 - 17:30 (9.0時間)
    { attendance_id: 'a3', worker_id: 'w1', contractor_id: 'c1', punch_type: 'CLOCK_IN', clocked_at: '2026-04-14T08:30:00Z', punched_by: 'u2', photo_object_id: 'p3', created_at: '2026-04-14T08:30:00Z' },
    { attendance_id: 'a4', worker_id: 'w1', contractor_id: 'c1', punch_type: 'CLOCK_OUT', clocked_at: '2026-04-14T17:30:00Z', punched_by: 'u2', photo_object_id: 'p4', created_at: '2026-04-14T17:30:00Z' },
    // w2: 2026-04-13 08:00 - 12:00 (4.0時間)
    { attendance_id: 'a5', worker_id: 'w2', contractor_id: 'c1', punch_type: 'CLOCK_IN', clocked_at: '2026-04-13T08:00:00Z', punched_by: 'u2', photo_object_id: 'p5', created_at: '2026-04-13T08:00:00Z' },
    { attendance_id: 'a6', worker_id: 'w2', contractor_id: 'c1', punch_type: 'CLOCK_OUT', clocked_at: '2026-04-13T12:00:00Z', punched_by: 'u2', photo_object_id: 'p6', created_at: '2026-04-13T12:00:00Z' },
    // w3: 2026-04-13 09:00 - 18:00 (9.0時間)
    { attendance_id: 'a7', worker_id: 'w3', contractor_id: 'c2', punch_type: 'CLOCK_IN', clocked_at: '2026-04-13T09:00:00Z', punched_by: 'u2', photo_object_id: 'p7', created_at: '2026-04-13T09:00:00Z' },
    { attendance_id: 'a8', worker_id: 'w3', contractor_id: 'c2', punch_type: 'CLOCK_OUT', clocked_at: '2026-04-13T18:00:00Z', punched_by: 'u2', photo_object_id: 'p8', created_at: '2026-04-13T18:00:00Z' }
  ] as AttendanceRecord[]
};

export function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('IndexedDB is not available in SSR'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

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
    };
  });
}

export async function initSeedData(force = false): Promise<void> {
  const db = await openDatabase();
  const tx = db.transaction(['contractors', 'users', 'workers', 'attendance_records'], 'readwrite');

  const checkEmpty = (): Promise<boolean> => {
    return new Promise((resolve) => {
      const store = tx.objectStore('workers');
      const countRequest = store.count();
      countRequest.onsuccess = () => resolve(countRequest.result === 0);
    });
  };

  const isEmpty = await checkEmpty();

  if (isEmpty || force) {
    const putData = (storeName: keyof typeof SEED_DATA, dataArray: any[]) => {
      const store = tx.objectStore(storeName);
      if (force) store.clear();
      dataArray.forEach(item => store.put(item));
    };

    putData('contractors', SEED_DATA.contractors);
    putData('users', SEED_DATA.users);
    putData('workers', SEED_DATA.workers);
    putData('attendance_records', SEED_DATA.attendance_records);
  }

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getAllFromStore<T>(storeName: string): Promise<T[]> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result as T[]);
    request.onerror = () => reject(request.error);
  });
}