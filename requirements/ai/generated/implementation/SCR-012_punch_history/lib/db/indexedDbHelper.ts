import { Contractor } from '../../features/contractor/domain/types';
import { Worker } from '../../features/worker/domain/types';
import { AttendanceRecord, PhotoBlob } from '../../features/attendance/domain/types';

const DB_NAME = 'worker-attendance-system-db';
const DB_VERSION = 1;

export function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('IndexedDB is only available in the browser'));
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

const createDummyBlob = (text: string): Blob => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
    <rect width="100%" height="100%" fill="#cbd5e1"/>
    <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="14" fill="#334155">${text}</text>
  </svg>`;
  return new Blob([svg], { type: 'image/svg+xml' });
};

export async function seedDatabase(force = false): Promise<void> {
  const db = await initDB();
  
  const checkEmpty = (): Promise<boolean> => {
    return new Promise((resolve) => {
      const tx = db.transaction('contractors', 'readonly');
      const store = tx.objectStore('contractors');
      const req = store.count();
      req.onsuccess = () => resolve(req.result === 0);
      req.onerror = () => resolve(true);
    });
  };

  const isEmpty = await checkEmpty();
  if (!isEmpty && !force) return;

  const contractors: Contractor[] = [
    { contractor_id: 'c1', name: '大和建設株式会社', status: 'ACTIVE', created_at: '2026-04-01T08:00:00Z', updated_at: '2026-04-01T08:00:00Z' },
    { contractor_id: 'c2', name: '東洋電設工業株式会社', status: 'ACTIVE', created_at: '2026-04-01T08:00:00Z', updated_at: '2026-04-01T08:00:00Z' }
  ];

  const workers: Worker[] = [
    { worker_id: 'w1', contractor_id: 'c1', name: '佐藤 博', contact: '090-1111-2222', qualifications: ['Q01'], trainings: [], status: 'ACTIVE', created_at: '2026-04-01T08:00:00Z', updated_at: '2026-04-01T08:00:00Z' },
    { worker_id: 'w2', contractor_id: 'c1', name: '鈴木 一郎', contact: '090-3333-4444', qualifications: ['Q02'], trainings: [], status: 'ACTIVE', created_at: '2026-04-01T08:00:00Z', updated_at: '2026-04-01T08:00:00Z' },
    { worker_id: 'w3', contractor_id: 'c2', name: '高橋 健二', contact: '090-5555-6666', qualifications: [], trainings: [], status: 'ACTIVE', created_at: '2026-04-01T08:00:00Z', updated_at: '2026-04-01T08:00:00Z' }
  ];

  const photoBlobs: PhotoBlob[] = [
    { photo_object_id: 'p1', blob: createDummyBlob('佐藤 博:出勤'), content_type: 'image/svg+xml', byte_size: 1000, uploaded_by: 'u1', uploaded_at: '2026-04-13T08:00:00Z' },
    { photo_object_id: 'p2', blob: createDummyBlob('鈴木 一郎:出勤'), content_type: 'image/svg+xml', byte_size: 1000, uploaded_by: 'u1', uploaded_at: '2026-04-13T08:05:00Z' },
    { photo_object_id: 'p3', blob: createDummyBlob('高橋 健二:出勤'), content_type: 'image/svg+xml', byte_size: 1000, uploaded_by: 'u2', uploaded_at: '2026-04-13T08:15:00Z' },
    { photo_object_id: 'p4', blob: createDummyBlob('佐藤 博:退勤'), content_type: 'image/svg+xml', byte_size: 1000, uploaded_by: 'u1', uploaded_at: '2026-04-13T17:00:00Z' }
  ];

  const attendanceRecords: AttendanceRecord[] = [
    { attendance_id: 'a1', worker_id: 'w1', contractor_id: 'c1', punch_type: 'CLOCK_IN', clocked_at: '2026-04-13T08:00:00+09:00', punched_by: 'u1', photo_object_id: 'p1', created_at: '2026-04-13T08:00:00Z' },
    { attendance_id: 'a2', worker_id: 'w2', contractor_id: 'c1', punch_type: 'CLOCK_IN', clocked_at: '2026-04-13T08:05:00+09:00', punched_by: 'u1', photo_object_id: 'p2', created_at: '2026-04-13T08:05:00Z' },
    { attendance_id: 'a3', worker_id: 'w3', contractor_id: 'c2', punch_type: 'CLOCK_IN', clocked_at: '2026-04-13T08:15:00+09:00', punched_by: 'u2', photo_object_id: 'p3', created_at: '2026-04-13T08:15:00Z' },
    { attendance_id: 'a4', worker_id: 'w1', contractor_id: 'c1', punch_type: 'CLOCK_OUT', clocked_at: '2026-04-13T17:00:00+09:00', punched_by: 'u1', photo_object_id: 'p4', created_at: '2026-04-13T17:00:00Z' }
  ];

  const tx = db.transaction(['contractors', 'workers', 'photo_blobs', 'attendance_records'], 'readwrite');
  
  const storeContractors = tx.objectStore('contractors');
  storeContractors.clear();
  contractors.forEach(item => storeContractors.put(item));

  const storeWorkers = tx.objectStore('workers');
  storeWorkers.clear();
  workers.forEach(item => storeWorkers.put(item));

  const storePhotos = tx.objectStore('photo_blobs');
  storePhotos.clear();
  photoBlobs.forEach(item => storePhotos.put(item));

  const storeRecords = tx.objectStore('attendance_records');
  storeRecords.clear();
  attendanceRecords.forEach(item => storeRecords.put(item));

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}