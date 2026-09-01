import { Contractor, User, Worker, AttendanceRecord, PhotoBlob } from '@/features/attendance/domain/types';

const DB_NAME = 'worker_attendance_db';
const DB_VERSION = 1;

export function getDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('IndexedDB is only available in the browser'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);

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

export function createDummyBlob(color: string): Blob {
  if (typeof window === 'undefined') return new Blob();
  const canvas = document.createElement('canvas');
  canvas.width = 120;
  canvas.height = 120;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 120, 120);
    ctx.fillStyle = '#ffffff';
    ctx.font = '10px sans-serif';
    ctx.fillText('DEMO PHOTO', 25, 60);
  }
  const dataURL = canvas.toDataURL('image/jpeg');
  const byteString = atob(dataURL.split(',')[1]);
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  return new Blob([ab], { type: 'image/jpeg' });
}

export async function seedDatabase(force = false): Promise<void> {
  const db = await getDB();
  
  const checkEmpty = () => new Promise<boolean>((resolve) => {
    const tx = db.transaction('contractors', 'readonly');
    const store = tx.objectStore('contractors');
    const req = store.count();
    req.onsuccess = () => resolve(req.result === 0);
    req.onerror = () => resolve(true);
  });

  const isEmpty = await checkEmpty();
  if (!isEmpty && !force) return;

  const tx = db.transaction(
    ['contractors', 'users', 'workers', 'attendance_records', 'photo_blobs', 'attendance_corrections', 'audit_logs'],
    'readwrite'
  );

  // Clear stores
  ['contractors', 'users', 'workers', 'attendance_records', 'photo_blobs', 'attendance_corrections', 'audit_logs'].forEach((storeName) => {
    tx.objectStore(storeName).clear();
  });

  const contractors: Contractor[] = [
    { contractor_id: 'c-1', name: '大都工業 (株)', status: 'ACTIVE', created_at: '2026-04-10T08:00:00Z', updated_at: '2026-04-10T08:00:00Z' },
    { contractor_id: 'c-2', name: 'シンセイ・テック (有)', status: 'ACTIVE', created_at: '2026-04-10T08:00:00Z', updated_at: '2026-04-10T08:00:00Z' },
    { contractor_id: 'c-3', name: '不活性外注先 (株)', status: 'INACTIVE', created_at: '2026-04-10T08:00:00Z', updated_at: '2026-04-10T08:00:00Z' },
  ];

  const users: User[] = [
    { user_id: 'u-1', contractor_id: null, role: 'FACTORY_ADMIN', login_id: 'admin', password_hash: 'dummy', display_name: '工場側管理者 鈴木', status: 'ACTIVE', created_at: '2026-04-10T08:00:00Z', updated_at: '2026-04-10T08:00:00Z' },
    { user_id: 'u-2', contractor_id: 'c-1', role: 'CONTRACTOR_MANAGER', login_id: 'sub1', password_hash: 'dummy', display_name: '外注先管理者 田中', status: 'ACTIVE', created_at: '2026-04-10T08:00:00Z', updated_at: '2026-04-10T08:00:00Z' },
  ];

  const workers: Worker[] = [
    { worker_id: 'w-1', contractor_id: 'c-1', name: '鈴木 一郎', status: 'ACTIVE', qualifications: ['Q01'], trainings: [], created_at: '2026-04-10T08:00:00Z', updated_at: '2026-04-10T08:00:00Z' },
    { worker_id: 'w-2', contractor_id: 'c-1', name: '佐藤 二朗', status: 'ACTIVE', qualifications: [], trainings: [], created_at: '2026-04-10T08:00:00Z', updated_at: '2026-04-10T08:00:00Z' },
    { worker_id: 'w-3', contractor_id: 'c-2', name: '高橋 三郎', status: 'ACTIVE', qualifications: ['Q02'], trainings: [], created_at: '2026-04-10T08:00:00Z', updated_at: '2026-04-10T08:00:00Z' },
    { worker_id: 'w-4', contractor_id: 'c-2', name: '渡辺 四郎', status: 'ACTIVE', qualifications: [], trainings: [], created_at: '2026-04-10T08:00:00Z', updated_at: '2026-04-10T08:00:00Z' },
  ];

  const today = '2026-04-13';
  const records: AttendanceRecord[] = [
    { attendance_id: 'a-1', worker_id: 'w-1', contractor_id: 'c-1', punch_type: 'CLOCK_IN', clocked_at: `${today}T08:00:15+09:00`, punched_by: 'u-2', photo_object_id: 'ph-1', created_at: `${today}T08:00:15+09:00` },
    { attendance_id: 'a-2', worker_id: 'w-1', contractor_id: 'c-1', punch_type: 'CLOCK_OUT', clocked_at: `${today}T17:05:43+09:00`, punched_by: 'u-2', photo_object_id: 'ph-2', created_at: `${today}T17:05:43+09:00` },
    { attendance_id: 'a-3', worker_id: 'w-2', contractor_id: 'c-1', punch_type: 'CLOCK_IN', clocked_at: `${today}T08:12:00+09:00`, punched_by: 'u-2', photo_object_id: 'ph-3', created_at: `${today}T08:12:00+09:00` },
    { attendance_id: 'a-4', worker_id: 'w-3', contractor_id: 'c-2', punch_type: 'CLOCK_IN', clocked_at: `${today}T07:55:22+09:00`, punched_by: 'u-2', photo_object_id: 'ph-4', created_at: `${today}T07:55:22+09:00` }
  ];

  const blobs: PhotoBlob[] = [
    { photo_object_id: 'ph-1', blob: createDummyBlob('#e11d48'), content_type: 'image/jpeg', byte_size: 1000, uploaded_by: 'u-2', uploaded_at: `${today}T08:00:15+09:00` },
    { photo_object_id: 'ph-2', blob: createDummyBlob('#2563eb'), content_type: 'image/jpeg', byte_size: 1000, uploaded_by: 'u-2', uploaded_at: `${today}T17:05:43+09:00` },
    { photo_object_id: 'ph-3', blob: createDummyBlob('#16a34a'), content_type: 'image/jpeg', byte_size: 1000, uploaded_by: 'u-2', uploaded_at: `${today}T08:12:00+09:00` },
    { photo_object_id: 'ph-4', blob: createDummyBlob('#ca8a04'), content_type: 'image/jpeg', byte_size: 1000, uploaded_by: 'u-2', uploaded_at: `${today}T07:55:22+09:00` }
  ];

  contractors.forEach(x => tx.objectStore('contractors').put(x));
  users.forEach(x => tx.objectStore('users').put(x));
  workers.forEach(x => tx.objectStore('workers').put(x));
  records.forEach(x => tx.objectStore('attendance_records').put(x));
  blobs.forEach(x => tx.objectStore('photo_blobs').put(x));

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
