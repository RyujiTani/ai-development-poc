import { AttendanceRecord, AttendanceCorrection } from '../domain/attendance';
import { openDB } from '@/lib/db/indexedDb';

export interface AttendanceRepository {
  saveCorrection(correction: AttendanceCorrection, record: AttendanceRecord): Promise<void>;
}

export class IndexedDBAttendanceRepository implements AttendanceRepository {
  async saveCorrection(correction: AttendanceCorrection, record: AttendanceRecord): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['attendance_records', 'attendance_corrections'], 'readwrite');

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);

      const recordsStore = tx.objectStore('attendance_records');
      const correctionsStore = tx.objectStore('attendance_corrections');

      recordsStore.put(record);
      correctionsStore.put(correction);
    });
  }
}
