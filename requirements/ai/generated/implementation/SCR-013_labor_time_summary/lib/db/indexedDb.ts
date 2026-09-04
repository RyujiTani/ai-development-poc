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

const DB_NAME = 'worker_attendance_db';
const DB_VERSION = 1;

export function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('IndexedDB is only available in browser'));
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
        db.createObjectStore('workers', { keyPath: 'worker_id' });
      }
      if (!db.objectStoreNames.contains('attendance_records')) {
        db.createObjectStore('attendance_records', { keyPath: 'attendance_id' });
      }
    };
  });
}

export async function seedDatabase() {
  const db = await initDB();
  const tx = db.transaction(['contractors', 'users', 'workers', 'attendance_records'], 'readwrite');
  
  const contractorsStore = tx.objectStore('contractors');
  const usersStore = tx.objectStore('users');
  const workersStore = tx.objectStore('workers');
  const attendanceStore = tx.objectStore('attendance_records');

  const countRequest = contractorsStore.count();
  countRequest.onsuccess = () => {
    if (countRequest.result === 0) {
      const mockContractors: Contractor[] = [
        { contractor_id: 'c1', name: '大和建設', status: 'ACTIVE', created_at: '2026-04-01T00:00:00Z', updated_at: '2026-04-01T00:00:00Z' },
        { contractor_id: 'c2', name: '東洋電設', status: 'ACTIVE', created_at: '2026-04-01T00:00:00Z', updated_at: '2026-04-01T00:00:00Z' }
      ];
      mockContractors.forEach(c => contractorsStore.put(c));

      const mockUsers: User[] = [
        { user_id: 'u1', contractor_id: null, role: 'FACTORY_ADMIN', login_id: 'admin', password_hash: 'admin', display_name: '工場管理者 太田', status: 'ACTIVE', created_at: '2026-04-01T00:00:00Z', updated_at: '2026-04-01T00:00:00Z' },
        { user_id: 'u2', contractor_id: 'c1', role: 'CONTRACTOR_MANAGER', login_id: 'sub1', password_hash: 'sub1', display_name: '大和 担当者', status: 'ACTIVE', created_at: '2026-04-01T00:00:00Z', updated_at: '2026-04-01T00:00:00Z' }
      ];
      mockUsers.forEach(u => usersStore.put(u));

      const mockWorkers: Worker[] = [
        { worker_id: 'w1', contractor_id: 'c1', name: '山田 太郎', contact: '090-1111-2222', qualifications: ['Q01'], trainings: [], status: 'ACTIVE', created_at: '2026-04-01T00:00:00Z', updated_at: '2026-04-01T00:00:00Z' },
        { worker_id: 'w2', contractor_id: 'c1', name: '佐藤 次郎', contact: '090-3333-4444', qualifications: ['Q02'], trainings: [], status: 'ACTIVE', created_at: '2026-04-01T00:00:00Z', updated_at: '2026-04-01T00:00:00Z' },
        { worker_id: 'w3', contractor_id: 'c2', name: '鈴木 三郎', contact: '090-5555-6666', qualifications: [], trainings: [], status: 'ACTIVE', created_at: '2026-04-01T00:00:00Z', updated_at: '2026-04-01T00:00:00Z' }
      ];
      mockWorkers.forEach(w => workersStore.put(w));

      const mockAttendances: AttendanceRecord[] = [
        { attendance_id: 'a1', worker_id: 'w1', contractor_id: 'c1', punch_type: 'CLOCK_IN', clocked_at: '2026-04-01T09:00:00+09:00', punched_by: 'u2', photo_object_id: 'p1', created_at: '2026-04-01T09:00:00+09:00' },
        { attendance_id: 'a2', worker_id: 'w1', contractor_id: 'c1', punch_type: 'CLOCK_OUT', clocked_at: '2026-04-01T18:00:00+09:00', punched_by: 'u2', photo_object_id: 'p2', created_at: '2026-04-01T18:00:00+09:00' },
        
        { attendance_id: 'a3', worker_id: 'w2', contractor_id: 'c1', punch_type: 'CLOCK_IN', clocked_at: '2026-04-01T08:30:00+09:00', punched_by: 'u2', photo_object_id: 'p3', created_at: '2026-04-01T08:30:00+09:00' },
        { attendance_id: 'a4', worker_id: 'w2', contractor_id: 'c1', punch_type: 'CLOCK_OUT', clocked_at: '2026-04-01T17:30:00+09:00', punched_by: 'u2', photo_object_id: 'p4', created_at: '2026-04-01T17:30:00+09:00' },

        { attendance_id: 'a5', worker_id: 'w1', contractor_id: 'c1', punch_type: 'CLOCK_IN', clocked_at: '2026-04-02T09:00:00+09:00', punched_by: 'u2', photo_object_id: 'p5', created_at: '2026-04-02T09:00:00+09:00' },
        { attendance_id: 'a6', worker_id: 'w1', contractor_id: 'c1', punch_type: 'CLOCK_OUT', clocked_at: '2026-04-02T12:00:00+09:00', punched_by: 'u2', photo_object_id: 'p6', created_at: '2026-04-02T12:00:00+09:00' },
        { attendance_id: 'a7', worker_id: 'w1', contractor_id: 'c1', punch_type: 'CLOCK_IN', clocked_at: '2026-04-02T13:00:00+09:00', punched_by: 'u2', photo_object_id: 'p7', created_at: '2026-04-02T13:00:00+09:00' },
        { attendance_id: 'a8', worker_id: 'w1', contractor_id: 'c1', punch_type: 'CLOCK_OUT', clocked_at: '2026-04-02T18:00:00+09:00', punched_by: 'u2', photo_object_id: 'p8', created_at: '2026-04-02T18:00:00+09:00' },

        { attendance_id: 'a9', worker_id: 'w3', contractor_id: 'c2', punch_type: 'CLOCK_IN', clocked_at: '2026-04-02T08:00:00+09:00', punched_by: 'u2', photo_object_id: 'p9', created_at: '2026-04-02T08:00:00+09:00' },
        { attendance_id: 'a10', worker_id: 'w3', contractor_id: 'c2', punch_type: 'CLOCK_OUT', clocked_at: '2026-04-02T17:00:00+09:00', punched_by: 'u2', photo_object_id: 'p10', created_at: '2026-04-02T17:00:00+09:00' }
      ];
      mockAttendances.forEach(a => attendanceStore.put(a));
    }
  };
}