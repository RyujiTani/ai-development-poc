import { Contractor, User, Worker, AttendanceRecord, PhotoBlob } from '../../features/attendance/domain/types';

const DB_NAME = 'worker_attendance_db';
const DB_VERSION = 1;

export function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('IndexedDB is not available in SSR'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

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

export async function seedDatabase(db: IDBDatabase): Promise<void> {
  const tx = db.transaction(
    ['contractors', 'users', 'workers', 'attendance_records', 'photo_blobs'],
    'readwrite'
  );

  const clearStore = (storeName: string) => {
    return new Promise<void>((resolve, reject) => {
      const store = tx.objectStore(storeName);
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  };

  await Promise.all([
    clearStore('contractors'),
    clearStore('users'),
    clearStore('workers'),
    clearStore('attendance_records'),
    clearStore('photo_blobs'),
  ]);

  const putItem = (storeName: string, item: any) => {
    return new Promise<void>((resolve, reject) => {
      const store = tx.objectStore(storeName);
      const req = store.put(item);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  };

  const contractors: Contractor[] = [
    {
      contractor_id: 'CT-001',
      name: '株式会社A建設',
      status: 'ACTIVE',
      created_at: '2026-04-01T08:00:00Z',
      updated_at: '2026-04-01T08:00:00Z',
    },
    {
      contractor_id: 'CT-002',
      name: '有限会社B興業',
      status: 'ACTIVE',
      created_at: '2026-04-01T08:00:00Z',
      updated_at: '2026-04-01T08:00:00Z',
    },
  ];

  const users: User[] = [
    {
      user_id: 'US-001',
      contractor_id: null,
      role: 'FACTORY_ADMIN',
      login_id: 'admin',
      password_hash: 'adminpass',
      display_name: '工場管理者 鈴木',
      status: 'ACTIVE',
      created_at: '2026-04-01T08:00:00Z',
      updated_at: '2026-04-01T08:00:00Z',
    },
    {
      user_id: 'US-002',
      contractor_id: 'CT-001',
      role: 'CONTRACTOR_MANAGER',
      login_id: 'contractor1',
      password_hash: 'managerpass',
      display_name: '外注管理者 田中',
      status: 'ACTIVE',
      created_at: '2026-04-01T08:00:00Z',
      updated_at: '2026-04-01T08:00:00Z',
    },
  ];

  const workers: Worker[] = [
    {
      worker_id: 'WK-001',
      contractor_id: 'CT-001',
      name: '山田 太郎',
      contact: '090-1234-5678',
      qualifications: ['QL-001'],
      trainings: [{ code: 'TR-001', taken_at: '2026-01-10' }],
      status: 'ACTIVE',
      created_at: '2026-04-01T08:00:00Z',
      updated_at: '2026-04-01T08:00:00Z',
    },
    {
      worker_id: 'WK-002',
      contractor_id: 'CT-001',
      name: '佐藤 次郎',
      contact: '090-2345-6789',
      qualifications: [],
      trainings: [],
      status: 'ACTIVE',
      created_at: '2026-04-01T08:00:00Z',
      updated_at: '2026-04-01T08:00:00Z',
    },
    {
      worker_id: 'WK-003',
      contractor_id: 'CT-002',
      name: '鈴木 三郎',
      contact: '090-3456-7890',
      qualifications: ['QL-002'],
      trainings: [{ code: 'TR-002', taken_at: '2026-02-15' }],
      status: 'ACTIVE',
      created_at: '2026-04-01T08:00:00Z',
      updated_at: '2026-04-01T08:00:00Z',
    },
  ];

  const base64Gif = 'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
  const binaryGif = typeof window !== 'undefined' ? window.atob(base64Gif) : '';
  const arrayGif = new Uint8Array(binaryGif.length);
  for (let i = 0; i < binaryGif.length; i++) {
    arrayGif[i] = binaryGif.charCodeAt(i);
  }
  const dummyBlob = new Blob([arrayGif], { type: 'image/gif' });

  const photoBlobs: PhotoBlob[] = [
    {
      photo_object_id: 'PH-001',
      blob: dummyBlob,
      content_type: 'image/gif',
      byte_size: dummyBlob.size,
      uploaded_by: 'US-002',
      uploaded_at: '2026-04-13T08:00:00Z',
    },
    {
      photo_object_id: 'PH-002',
      blob: dummyBlob,
      content_type: 'image/gif',
      byte_size: dummyBlob.size,
      uploaded_by: 'US-002',
      uploaded_at: '2026-04-13T17:00:00Z',
    },
  ];

  const attendanceRecords: AttendanceRecord[] = [
    {
      attendance_id: 'AT-001',
      worker_id: 'WK-001',
      contractor_id: 'CT-001',
      punch_type: 'CLOCK_IN',
      clocked_at: '2026-04-13T08:00:00Z',
      punched_by: 'US-002',
      geo: { lat: 35.681236, lng: 139.767125 },
      photo_object_id: 'PH-001',
      created_at: '2026-04-13T08:01:00Z',
    },
    {
      attendance_id: 'AT-002',
      worker_id: 'WK-001',
      contractor_id: 'CT-001',
      punch_type: 'CLOCK_OUT',
      clocked_at: '2026-04-13T17:00:00Z',
      punched_by: 'US-002',
      geo: { lat: 35.681236, lng: 139.767125 },
      photo_object_id: 'PH-002',
      created_at: '2026-04-13T17:01:00Z',
    },
    {
      attendance_id: 'AT-003',
      worker_id: 'WK-003',
      contractor_id: 'CT-002',
      punch_type: 'CLOCK_IN',
      clocked_at: '2026-04-13T08:15:00Z',
      punched_by: 'US-001',
      geo: { lat: 35.681236, lng: 139.767125 },
      photo_object_id: 'PH-001',
      created_at: '2026-04-13T08:16:00Z',
    },
  ];

  await Promise.all([
    ...contractors.map((c) => putItem('contractors', c)),
    ...users.map((u) => putItem('users', u)),
    ...workers.map((w) => putItem('workers', w)),
    ...photoBlobs.map((p) => putItem('photo_blobs', p)),
    ...attendanceRecords.map((a) => putItem('attendance_records', a)),
  ]);
}