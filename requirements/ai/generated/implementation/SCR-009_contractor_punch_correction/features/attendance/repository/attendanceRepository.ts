import { Worker, AttendanceRecord, AttendanceCorrection } from '@/features/attendance/domain/types';
import { openDatabase } from '@/lib/db/indexedDb';

export interface IAttendanceRepository {
  getWorkersByContractor(contractorId: string): Promise<Worker[]>;
  getAttendanceRecord(attendanceId: string): Promise<AttendanceRecord | null>;
  getAttendanceRecordsByWorker(workerId: string): Promise<AttendanceRecord[]>;
  saveAttendanceRecord(record: AttendanceRecord): Promise<void>;
  saveAttendanceCorrection(correction: AttendanceCorrection): Promise<void>;
}

export class AttendanceRepository implements IAttendanceRepository {
  async getWorkersByContractor(contractorId: string): Promise<Worker[]> {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('workers', 'readonly');
      const store = transaction.objectStore('workers');
      const index = store.index('contractor_id');
      const request = index.getAll(contractorId);

      request.onsuccess = () => {
        // ACTIVEな作業員のみをフィルタリング
        const activeWorkers = (request.result as Worker[]).filter(
          (worker) => worker.status === 'ACTIVE'
        );
        resolve(activeWorkers);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  async getAttendanceRecord(attendanceId: string): Promise<AttendanceRecord | null> {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('attendance_records', 'readonly');
      const store = transaction.objectStore('attendance_records');
      const request = store.get(attendanceId);

      request.onsuccess = () => {
        resolve(request.result || null);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  async getAttendanceRecordsByWorker(workerId: string): Promise<AttendanceRecord[]> {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('attendance_records', 'readonly');
      const store = transaction.objectStore('attendance_records');
      const index = store.index('worker_id');
      const request = index.getAll(workerId);

      request.onsuccess = () => {
        // 日時の降順でソートして返却
        const sorted = (request.result as AttendanceRecord[]).sort(
          (a, b) => new Date(b.clocked_at).getTime() - new Date(a.clocked_at).getTime()
        );
        resolve(sorted);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  async saveAttendanceRecord(record: AttendanceRecord): Promise<void> {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('attendance_records', 'readwrite');
      const store = transaction.objectStore('attendance_records');
      const request = store.put(record);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  async saveAttendanceCorrection(correction: AttendanceCorrection): Promise<void> {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('attendance_corrections', 'readwrite');
      const store = transaction.objectStore('attendance_corrections');
      const request = store.put(correction);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }
}