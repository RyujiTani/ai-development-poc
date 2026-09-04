import { Contractor, User, Worker, AttendanceRecord, AuditLog } from '../../features/attendance/domain/types';

const DB_NAME = 'worker_attendance_system';
const DB_VERSION = 1;

export const INITIAL_CONTRACTORS: Contractor[] = [
  {
    contractor_id: 'c1',
    name: '株式会社 大和建設',
    status: 'ACTIVE',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    contractor_id: 'c2',
    name: '東洋電設工業 株式会社',
    status: 'ACTIVE',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
];

export const INITIAL_USERS: User[] = [
  {
    user_id: 'u1',
    contractor_id: null,
    role: 'FACTORY_ADMIN',
    login_id: 'admin',
    password_hash: 'admin123',
    display_name: '工場側管理者A',
    status: 'ACTIVE',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    user_id: 'u2',
    contractor_id: 'c1',
    role: 'CONTRACTOR_MANAGER',
    login_id: 'subcontractor1',
    password_hash: 'sub123',
    display_name: '外注先管理者B（大和建設）',
    status: 'ACTIVE',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
];

export const INITIAL_WORKERS: Worker[] = [
  {
    worker_id: 'w1',
    contractor_id: 'c1',
    name: '佐藤 健太',
    contact: '090-1234-5678',
    qualifications: ['QUAL-001', 'QUAL-002'], // 玉掛け, 高所
    trainings: [{ code: 'TR-01', taken_at: '2025-10-10' }],
    status: 'ACTIVE',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    worker_id: 'w2',
    contractor_id: 'c1',
    name: '田中 次郎',
    contact: '090-8765-4321',
    qualifications: ['QUAL-001'],
    trainings: [],
    status: 'ACTIVE',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    worker_id: 'w3',
    contractor_id: 'c2',
    name: '鈴木 祥平',
    contact: '080-1111-2222',
    qualifications: ['QUAL-003'], // フォークリフト
    trainings: [{ code: 'TR-01', taken_at: '2025-11-15' }],
    status: 'ACTIVE',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
];

export const INITIAL_ATTENDANCE: AttendanceRecord[] = [
  {
    attendance_id: 'att1',
    worker_id: 'w1',
    contractor_id: 'c1',
    punch_type: 'CLOCK_IN',
    clocked_at: new Date(new Date().setHours(8, 0, 0)).toISOString(),
    punched_by: 'u2',
    photo_object_id: 'photo1',
    created_at: new Date().toISOString(),
  },
  {
    attendance_id: 'att2',
    worker_id: 'w2',
    contractor_id: 'c1',
    punch_type: 'CLOCK_IN',
    clocked_at: new Date(new Date().setHours(8, 5, 0)).toISOString(),
    punched_by: 'u2',
    photo_object_id: 'photo2',
    created_at: new Date().toISOString(),
  }
];

export const INITIAL_AUDIT_LOGS: AuditLog[] = [
  {
    audit_id: 'audit1',
    occurred_at: new Date(new Date().getTime() - 3600000).toISOString(),
    actor_user_id: 'u2',
    actor_role: 'CONTRACTOR_MANAGER',
    action: 'PUNCH',
    target_type: 'attendance_records',
    target_id: 'att1',
    detail: { message: '佐藤 健太の出勤打刻を実施しました。' }
  },
  {
    audit_id: 'audit2',
    occurred_at: new Date().toISOString(),
    actor_user_id: 'u2',
    actor_role: 'CONTRACTOR_MANAGER',
    action: 'PUNCH',
    target_type: 'attendance_records',
    target_id: 'att2',
    detail: { message: '田中 次郎の出勤打刻を実施しました。' }
  }
];

export function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('IndexedDB is not available on Server Side'));
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
  });
}

export async function initializeSeedData(): Promise<void> {
  const db = await openDB();

  const checkIfEmpty = (storeName: string): Promise<boolean> => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const countRequest = store.count();
      countRequest.onsuccess = () => {
        resolve(countRequest.result === 0);
      };
      countRequest.onerror = () => {
        reject(countRequest.error);
      };
    });
  };

  const isContractorsEmpty = await checkIfEmpty('contractors');
  if (isContractorsEmpty) {
    const transaction = db.transaction(
      ['contractors', 'users', 'workers', 'attendance_records', 'audit_logs'],
      'readwrite'
    );

    INITIAL_CONTRACTORS.forEach((c) => transaction.objectStore('contractors').put(c));
    INITIAL_USERS.forEach((u) => transaction.objectStore('users').put(u));
    INITIAL_WORKERS.forEach((w) => transaction.objectStore('workers').put(w));
    INITIAL_ATTENDANCE.forEach((a) => transaction.objectStore('attendance_records').put(a));
    INITIAL_AUDIT_LOGS.forEach((l) => transaction.objectStore('audit_logs').put(l));

    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }
}

export function getAllFromStore<T>(storeName: string): Promise<T[]> {
  return openDB().then((db) => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
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