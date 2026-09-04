import { openDB } from '../../../lib/db/indexedDB';
import { PunchType } from '../store/useAttendanceStore';

export interface AttendanceRecord {
  attendance_id: string;
  worker_id: string;
  contractor_id: string;
  punch_type: PunchType;
  clocked_at: string;             // ISO8601
  punched_by: string;             // user_id
  geo?: { lat: number; lng: number };
  photo_object_id: string;
  created_at: string;
}

export interface PhotoBlob {
  photo_object_id: string;
  blob: Blob;                     // IndexedDB に Blob 直接保存
  content_type: string;
  byte_size: number;
  uploaded_by: string;
  uploaded_at: string;
}

export interface AttendanceCorrection {
  correction_id: string;
  attendance_id?: string;         // 新規登録時 undefined
  corrected_by: string;
  reason: string;                 // 必須
  before?: Partial<AttendanceRecord>;
  after: Partial<AttendanceRecord>;
  corrected_at: string;
}

export interface AttendanceRepository {
  savePunch(records: AttendanceRecord[], photo: PhotoBlob): Promise<void>;
  findRecordsByWorkerId(workerId: string): Promise<AttendanceRecord[]>;
  saveCorrection(correction: AttendanceCorrection, updatedRecord?: AttendanceRecord, isNewPunch?: boolean): Promise<void>;
  findAllRecords(): Promise<AttendanceRecord[]>;
  findPhotoById(photoObjectId: string): Promise<PhotoBlob | null>;
}

export class IndexedDBAttendanceRepository implements AttendanceRepository {
  async savePunch(records: AttendanceRecord[], photo: PhotoBlob): Promise<void> {
    const db = await openDB();
    const tx = db.transaction(['attendance_records', 'photo_blobs'], 'readwrite');
    const attendanceStore = tx.objectStore('attendance_records');
    const photoStore = tx.objectStore('photo_blobs');

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);

      // 写真データを保存
      photoStore.put(photo);

      // 複数作業員分の打刻データを一括で保存
      for (const record of records) {
        attendanceStore.put(record);
      }
    });
  }

  async findRecordsByWorkerId(workerId: string): Promise<AttendanceRecord[]> {
    const db = await openDB();
    const tx = db.transaction('attendance_records', 'readonly');
    const store = tx.objectStore('attendance_records');

    return new Promise((resolve, reject) => {
      const request = store.openCursor();
      const results: AttendanceRecord[] = [];

      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          const record = cursor.value as AttendanceRecord;
          if (record.worker_id === workerId) {
            results.push(record);
          }
          cursor.continue();
        } else {
          // 日時降順でソート
          results.sort((a, b) => new Date(b.clocked_at).getTime() - new Date(a.clocked_at).getTime());
          resolve(results);
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  async saveCorrection(
    correction: AttendanceCorrection,
    updatedRecord?: AttendanceRecord,
    isNewPunch?: boolean
  ): Promise<void> {
    const db = await openDB();
    const tx = db.transaction(['attendance_records', 'attendance_corrections'], 'readwrite');
    const recordStore = tx.objectStore('attendance_records');
    const correctionStore = tx.objectStore('attendance_corrections');

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);

      // 修正履歴を保存
      correctionStore.put(correction);

      // 打刻レコードを更新または新規追加
      if (updatedRecord) {
        recordStore.put(updatedRecord);
      }
    });
  }

  async findAllRecords(): Promise<AttendanceRecord[]> {
    const db = await openDB();
    const tx = db.transaction('attendance_records', 'readonly');
    const store = tx.objectStore('attendance_records');

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        resolve(request.result || []);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async findPhotoById(photoObjectId: string): Promise<PhotoBlob | null> {
    const db = await openDB();
    const tx = db.transaction('photo_blobs', 'readonly');
    const store = tx.objectStore('photo_blobs');

    return new Promise((resolve, reject) => {
      const request = store.get(photoObjectId);
      request.onsuccess = () => {
        resolve(request.result || null);
      };
      request.onerror = () => reject(request.error);
    });
  }
}