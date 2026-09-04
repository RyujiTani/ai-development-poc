import { openDB } from '../../../lib/db/indexedDB';
import { AttendanceRecord, PhotoBlob } from '../domain/types';

export interface AttendanceRepository {
  savePhoto(photo: PhotoBlob): Promise<void>;
  saveAttendanceRecords(records: AttendanceRecord[]): Promise<void>;
}

export class IndexedDBAttendanceRepository implements AttendanceRepository {
  async savePhoto(photo: PhotoBlob): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('photo_blobs', 'readwrite');
      const store = transaction.objectStore('photo_blobs');
      const request = store.put(photo);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async saveAttendanceRecords(records: AttendanceRecord[]): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('attendance_records', 'readwrite');
      const store = transaction.objectStore('attendance_records');

      if (records.length === 0) {
        resolve();
        return;
      }

      let completed = 0;
      let hasError = false;

      records.forEach((record) => {
        const request = store.put(record);
        request.onsuccess = () => {
          completed++;
          if (completed === records.length && !hasError) {
            resolve();
          }
        };
        request.onerror = () => {
          if (!hasError) {
            hasError = true;
            reject(request.error);
          }
        };
      });
    });
  }
}