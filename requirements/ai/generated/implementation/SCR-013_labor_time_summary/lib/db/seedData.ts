import { getDB } from './indexedDb';

export const SEED_CONTRACTORS = [
  { contractor_id: 'c1', name: '第一工業株式会社', status: 'ACTIVE', created_at: '2026-04-01T00:00:00Z', updated_at: '2026-04-01T00:00:00Z' },
  { contractor_id: 'c2', name: '大和メンテナンス', status: 'ACTIVE', created_at: '2026-04-01T00:00:00Z', updated_at: '2026-04-01T00:00:00Z' }
];

export const SEED_USERS = [
  { user_id: 'u1', contractor_id: null, role: 'FACTORY_ADMIN', login_id: 'admin', password_hash: 'admin', display_name: '工場管理者A', status: 'ACTIVE', created_at: '2026-04-01T00:00:00Z', updated_at: '2026-04-01T00:00:00Z' },
  { user_id: 'u2', contractor_id: 'c1', role: 'CONTRACTOR_MANAGER', login_id: 'sub1', password_hash: 'sub1', display_name: '第一工業管理者', status: 'ACTIVE', created_at: '2026-04-01T00:00:00Z', updated_at: '2026-04-01T00:00:00Z' }
];

export const SEED_WORKERS = [
  { worker_id: 'w1', contractor_id: 'c1', name: '山田 太郎', contact: '090-1111-2222', qualifications: ['Q01'], trainings: [], status: 'ACTIVE', created_at: '2026-04-01T00:00:00Z', updated_at: '2026-04-01T00:00:00Z' },
  { worker_id: 'w2', contractor_id: 'c1', name: '佐藤 次郎', contact: '090-3333-4444', qualifications: ['Q02'], trainings: [], status: 'ACTIVE', created_at: '2026-04-01T00:00:00Z', updated_at: '2026-04-01T00:00:00Z' },
  { worker_id: 'w3', contractor_id: 'c2', name: '鈴木 三郎', contact: '090-5555-6666', qualifications: [], trainings: [], status: 'ACTIVE', created_at: '2026-04-01T00:00:00Z', updated_at: '2026-04-01T00:00:00Z' }
];

export const SEED_ATTENDANCE = [
  // w1 (山田太郎) 2026-04-13
  { attendance_id: 'a1', worker_id: 'w1', contractor_id: 'c1', punch_type: 'CLOCK_IN', clocked_at: '2026-04-13T08:00:00Z', punched_by: 'u2', photo_object_id: 'p1', created_at: '2026-04-13T08:00:00Z' },
  { attendance_id: 'a2', worker_id: 'w1', contractor_id: 'c1', punch_type: 'CLOCK_OUT', clocked_at: '2026-04-13T17:00:00Z', punched_by: 'u2', photo_object_id: 'p2', created_at: '2026-04-13T17:00:00Z' },
  // w1 (山田太郎) 2026-04-14
  { attendance_id: 'a3', worker_id: 'w1', contractor_id: 'c1', punch_type: 'CLOCK_IN', clocked_at: '2026-04-14T09:00:00Z', punched_by: 'u2', photo_object_id: 'p3', created_at: '2026-04-14T09:00:00Z' },
  { attendance_id: 'a4', worker_id: 'w1', contractor_id: 'c1', punch_type: 'CLOCK_OUT', clocked_at: '2026-04-14T18:00:00Z', punched_by: 'u2', photo_object_id: 'p4', created_at: '2026-04-14T18:00:00Z' },

  // w2 (佐藤次郎) 2026-04-13
  { attendance_id: 'a5', worker_id: 'w2', contractor_id: 'c1', punch_type: 'CLOCK_IN', clocked_at: '2026-04-13T08:30:00Z', punched_by: 'u2', photo_object_id: 'p5', created_at: '2026-04-13T08:30:00Z' },
  { attendance_id: 'a6', worker_id: 'w2', contractor_id: 'c1', punch_type: 'CLOCK_OUT', clocked_at: '2026-04-13T17:30:00Z', punched_by: 'u2', photo_object_id: 'p6', created_at: '2026-04-13T17:30:00Z' },

  // w3 (鈴木三郎) 2026-04-13
  { attendance_id: 'a7', worker_id: 'w3', contractor_id: 'c2', punch_type: 'CLOCK_IN', clocked_at: '2026-04-13T08:00:00Z', punched_by: 'u2', photo_object_id: 'p7', created_at: '2026-04-13T08:00:00Z' },
  { attendance_id: 'a8', worker_id: 'w3', contractor_id: 'c2', punch_type: 'CLOCK_OUT', clocked_at: '2026-04-13T12:00:00Z', punched_by: 'u2', photo_object_id: 'p8', created_at: '2026-04-13T12:00:00Z' }
];

export async function initSeedData(force = false) {
  const db = await getDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(['contractors', 'users', 'workers', 'attendance_records'], 'readwrite');
    
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);

    const contractorsStore = tx.objectStore('contractors');
    const countReq = contractorsStore.count();
    
    countReq.onsuccess = () => {
      if (force || countReq.result === 0) {
        if (force) {
          contractorsStore.clear();
          tx.objectStore('users').clear();
          tx.objectStore('workers').clear();
          tx.objectStore('attendance_records').clear();
        }
        SEED_CONTRACTORS.forEach(item => contractorsStore.put(item));
        SEED_USERS.forEach(item => tx.objectStore('users').put(item));
        SEED_WORKERS.forEach(item => tx.objectStore('workers').put(item));
        SEED_ATTENDANCE.forEach(item => tx.objectStore('attendance_records').put(item));
      }
    };
  });
}
"
    },
    {