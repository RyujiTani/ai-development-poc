import { Contractor, User, Worker, AttendanceRecord, AttendanceCorrection } from '@/features/attendance/domain/types';

const DB_NAME = 'worker_attendance_system_db';
const DB_VERSION = 1;

export function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('IndexedDB is only available in the browser.'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

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
        const workerStore = db.createObjectStore('workers', { keyPath: 'worker_id' });
        workerStore.createIndex('contractor_id', 'contractor_id', { unique: false });
      }
      if (!db.objectStoreNames.contains('attendance_records')) {
        const attendanceStore = db.createObjectStore('attendance_records', { keyPath: 'attendance_id' });
        attendanceStore.createIndex('worker_id', 'worker_id', { unique: false });
        attendanceStore.createIndex('contractor_id', 'contractor_id', { unique: false });
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

// 初期シードデータを投入する関数
export async function seedDatabase(db: IDBDatabase): Promise<void> {
  const transaction = db.transaction(
    ['contractors', 'users', 'workers', 'attendance_records'],
    'readwrite'
  );

  const checkEmpty = () => {
    return new Promise<boolean>((resolve) => {
      const store = transaction.objectStore('contractors');
      const request = store.count();
      request.onsuccess = () => {
        resolve(request.result === 0);
      };
    });
  };

  const isEmpty = await checkEmpty();
  if (!isEmpty) {
    return; // 既にデータがある場合はスキップ
  }

  const now = new Date().toISOString();

  // 1. Contractors
  const contractors: Contractor[] = [
    {
      contractor_id: 'contractor-A',
      name: '第一工業株式会社 (外注A社)',
      status: 'ACTIVE',
      created_at: now,
      updated_at: now,
    },
    {
      contractor_id: 'contractor-B',
      name: '建設サービス有限会社 (外注B社)',
      status: 'ACTIVE',
      created_at: now,
      updated_at: now,
    }
  ];

  // 2. Users
  const users: User[] = [
    {
      user_id: 'user-manager-A',
      contractor_id: 'contractor-A',
      role: 'CONTRACTOR_MANAGER',
      login_id: 'managerA',
      password_hash: 'mock_hash_A',
      display_name: '山田 太郎 (A社管理者)',
      status: 'ACTIVE',
      created_at: now,
      updated_at: now,
    },
    {
      user_id: 'user-manager-B',
      contractor_id: 'contractor-B',
      role: 'CONTRACTOR_MANAGER',
      login_id: 'managerB',
      password_hash: 'mock_hash_B',
      display_name: '佐藤 次郎 (B社管理者)',
      status: 'ACTIVE',
      created_at: now,
      updated_at: now,
    }
  ];

  // 3. Workers
  const workers: Worker[] = [
    {
      worker_id: 'worker-a1',
      contractor_id: 'contractor-A',
      name: '田中 一郎',
      contact: '090-1111-1111',
      qualifications: ['QUAL_001'],
      trainings: [{ code: 'TR_001', taken_at: '2025-04-01' }],
      status: 'ACTIVE',
      created_at: now,
      updated_at: now,
    },
    {
      worker_id: 'worker-a2',
      contractor_id: 'contractor-A',
      name: '鈴木 二郎',
      contact: '090-2222-2222',
      qualifications: [],
      trainings: [],
      status: 'ACTIVE',
      created_at: now,
      updated_at: now,
    },
    {
      worker_id: 'worker-b1',
      contractor_id: 'contractor-B',
      name: '高橋 三郎',
      contact: '090-3333-3333',
      qualifications: ['QUAL_002'],
      trainings: [{ code: 'TR_002', taken_at: '2025-05-10' }],
      status: 'ACTIVE',
      created_at: now,
      updated_at: now,
    }
  ];

  // 4. Attendance Records (初期履歴)
  const attendanceRecords: AttendanceRecord[] = [
    {
      attendance_id: 'att-1',
      worker_id: 'worker-a1',
      contractor_id: 'contractor-A',
      punch_type: 'CLOCK_IN',
      clocked_at: '2026-04-13T08:00:00+09:00',
      punched_by: 'user-manager-A',
      created_at: '2026-04-13T08:01:00+09:00'
    },
    {
      attendance_id: 'att-2',
      worker_id: 'worker-a1',
      contractor_id: 'contractor-A',
      punch_type: 'CLOCK_OUT',
      clocked_at: '2026-04-13T17:00:00+09:00',
      punched_by: 'user-manager-A',
      created_at: '2026-04-13T17:02:00+09:00'
    }
  ];

  // 全て保存
  const cStore = transaction.objectStore('contractors');
  contractors.forEach(item => cStore.put(item));

  const uStore = transaction.objectStore('users');
  users.forEach(item => uStore.put(item));

  const wStore = transaction.objectStore('workers');
  workers.forEach(item => wStore.put(item));

  const aStore = transaction.objectStore('attendance_records');
  attendanceRecords.forEach(item => aStore.put(item));

  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => {
      resolve();
    };
    transaction.onerror = () => {
      reject(transaction.error);
    };
  });
}

// データベースを初期リセットする開発者向けユーティリティ
export async function resetDatabase(): Promise<void> {
  if (typeof window === 'undefined') return;
  return new Promise((resolve, reject) => {
    const deleteRequest = indexedDB.deleteDatabase(DB_NAME);
    deleteRequest.onerror = () => reject(deleteRequest.error);
    deleteRequest.onsuccess = async () => {
      try {
        const db = await openDatabase();
        await seedDatabase(db);
        db.close();
        resolve();
      } catch (err) {
        reject(err);
      }
    };
  });
}