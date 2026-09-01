import { Worker, AttendanceRecord } from '../domain/worker';
import { initDB } from '@/lib/db/indexedDb';

export interface WorkerRepository {
  getWorkersByContractor(contractorId: string): Promise<Worker[]>;
  getAttendanceRecordsByDate(contractorId: string, dateStr: string): Promise<AttendanceRecord[]>;
}

export class IndexedDBWorkerRepository implements WorkerRepository {
  async getWorkersByContractor(contractorId: string): Promise<Worker[]> {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('workers', 'readonly');
      const store = transaction.objectStore('workers');
      const request = store.getAll();

      request.onsuccess = () => {
        const allWorkers = request.result as Worker[];
        const filtered = allWorkers.filter(
          w => w.contractor_id === contractorId && w.status === 'ACTIVE'
        );
        resolve(filtered);
      };

      request.onerror = () => reject(request.error);
    });
  }

  async getAttendanceRecordsByDate(contractorId: string, dateStr: string): Promise<AttendanceRecord[]> {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('attendance_records', 'readonly');
      const store = transaction.objectStore('attendance_records');
      const request = store.getAll();

      request.onsuccess = () => {
        const allRecords = request.result as AttendanceRecord[];
        const filtered = allRecords.filter(
          r => r.contractor_id === contractorId && r.clocked_at.startsWith(dateStr)
        );
        resolve(filtered);
      };

      request.onerror = () => reject(request.error);
    });
  }
}
