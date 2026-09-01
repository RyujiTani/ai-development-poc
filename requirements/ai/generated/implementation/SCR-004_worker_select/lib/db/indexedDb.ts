import { Worker, AttendanceRecord, User, Contractor } from '@/features/worker/domain/worker';

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

export async function seedDatabase(): Promise<void> {
  const db = await initDB();
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(
      ['contractors', 'users', 'workers', 'attendance_records'],
      'readwrite'
    );

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);

    const contractorStore = transaction.objectStore('contractors');
    const contractors: Contractor[] = [
      { contractor_id: 'C01', name: '大林元建設', status: 'ACTIVE', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { contractor_id: 'C02', name: '清水工務店', status: 'ACTIVE', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
    ];
    contractors.forEach(c => contractorStore.put(c));

    const userStore = transaction.objectStore('users');
    const users: User[] = [
      {
        user_id: 'U01',
        contractor_id: 'C01',
        role: 'CONTRACTOR_MANAGER',
        login_id: 'manager1',
        password_hash: 'dummy_hash',
        display_name: '佐藤 孝（大林元建設）',
        status: 'ACTIVE',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];
    users.forEach(u => userStore.put(u));

    const workerStore = transaction.objectStore('workers');
    const now = new Date().toISOString();
    const workers: Worker[] = [
      { worker_id: 'W01', contractor_id: 'C01', name: '佐藤 一郎', contact: '090-1111-2222', qualifications: ['高所作業車', '足場組立'], trainings: [], status: 'ACTIVE', created_at: now, updated_at: now },
      { worker_id: 'W02', contractor_id: 'C01', name: '鈴木 二郎', contact: '090-3333-4444', qualifications: ['クレーン運転', '玉掛け'], trainings: [], status: 'ACTIVE', created_at: now, updated_at: now },
      { worker_id: 'W03', contractor_id: 'C01', name: '高橋 三郎', contact: '090-5555-6666', qualifications: [], trainings: [], status: 'ACTIVE', created_at: now, updated_at: now },
      { worker_id: 'W04', contractor_id: 'C01', name: '田中 四郎', contact: '090-7777-8888', qualifications: ['有機溶剤'], trainings: [], status: 'ACTIVE', created_at: now, updated_at: now },
      { worker_id: 'W05', contractor_id: 'C01', name: '伊藤 五郎', contact: '090-9999-0000', qualifications: ['電気工事士'], trainings: [], status: 'ACTIVE', created_at: now, updated_at: now },
      { worker_id: 'W06', contractor_id: 'C01', name: '渡辺 六郎', contact: '090-1234-5678', qualifications: [], trainings: [], status: 'ACTIVE', created_at: now, updated_at: now },
      { worker_id: 'W07', contractor_id: 'C01', name: '山本 七郎', contact: '080-1111-2222', qualifications: ['高所作業車'], trainings: [], status: 'ACTIVE', created_at: now, updated_at: now },
      { worker_id: 'W08', contractor_id: 'C01', name: '中村 八郎', contact: '080-3333-4444', qualifications: ['玉掛け'], trainings: [], status: 'ACTIVE', created_at: now, updated_at: now },
      { worker_id: 'W09', contractor_id: 'C01', name: '小林 九郎', contact: '080-5555-6666', qualifications: [], trainings: [], status: 'ACTIVE', created_at: now, updated_at: now },
      { worker_id: 'W10', contractor_id: 'C01', name: '加藤 十郎', contact: '080-7777-8888', qualifications: ['足場組立'], trainings: [], status: 'ACTIVE', created_at: now, updated_at: now },
      { worker_id: 'W11', contractor_id: 'C01', name: '山田 十一朗', contact: '080-9999-0000', qualifications: [], trainings: [], status: 'ACTIVE', created_at: now, updated_at: now }
    ];
    workers.forEach(w => workerStore.put(w));

    const attendanceStore = transaction.objectStore('attendance_records');
    const todayStr = new Date().toISOString().split('T')[0];
    const attendance: AttendanceRecord = {
      attendance_id: 'A01',
      worker_id: 'W02',
      contractor_id: 'C01',
      punch_type: 'CLOCK_IN',
      clocked_at: `${todayStr}T08:00:00.000Z`,
      punched_by: 'U01',
      photo_object_id: 'photo_dummy',
      created_at: `${todayStr}T08:00:00.000Z`
    };
    attendanceStore.put(attendance);
  });
}
