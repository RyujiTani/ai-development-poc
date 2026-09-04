import { initDB } from '../../../lib/db/indexedDbHelper';
import { AttendanceRecord, AttendanceCorrection, PhotoBlob } from '../domain/types';

export interface AttendanceRepository {
  getFilteredRecords(date: string, contractorId?: string): Promise<AttendanceRecord[]>;
  getPhotoBlob(photoObjectId: string): Promise<PhotoBlob | null>;
  updateRecord(recordId: string, updatedData: Partial<AttendanceRecord>, reason: string, userId: string): Promise<void>;
  createRecord(record: Omit<AttendanceRecord, 'attendance_id' | 'created_at'>, userId: string, reason: string): Promise<void>;
}

export class IndexedDBAttendanceRepository implements AttendanceRepository {
  async getFilteredRecords(date: string, contractorId?: string): Promise<AttendanceRecord[]> {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('attendance_records', 'readonly');
      const store = tx.objectStore('attendance_records');
      const req = store.getAll();
      req.onsuccess = () => {
        const records: AttendanceRecord[] = req.result || [];
        const filtered = records.filter(r => {
          const recordDateStr = r.clocked_at.slice(0, 10);
          const dateMatch = recordDateStr === date;
          const contractorMatch = !contractorId || r.contractor_id === contractorId;
          return dateMatch && contractorMatch;
        });
        filtered.sort((a, b) => new Date(a.clocked_at).getTime() - new Date(b.clocked_at).getTime());
        resolve(filtered);
      };
      req.onerror = () => reject(req.error);
    });
  }

  async getPhotoBlob(photoObjectId: string): Promise<PhotoBlob | null> {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('photo_blobs', 'readonly');
      const store = tx.objectStore('photo_blobs');
      const req = store.get(photoObjectId);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  async updateRecord(recordId: string, updatedData: Partial<AttendanceRecord>, reason: string, userId: string): Promise<void> {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['attendance_records', 'attendance_corrections', 'audit_logs'], 'readwrite');
      const recordsStore = tx.objectStore('attendance_records');
      const correctionsStore = tx.objectStore('attendance_corrections');
      const auditStore = tx.objectStore('audit_logs');

      const getReq = recordsStore.get(recordId);
      getReq.onsuccess = () => {
        const currentRecord = getReq.result;
        if (!currentRecord) {
          reject(new Error(`Attendance record not found: ${recordId}`));
          return;
        }

        const updatedRecord = {
          ...currentRecord,
          ...updatedData,
        };

        const correction: AttendanceCorrection = {
          correction_id: `corr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          attendance_id: recordId,
          corrected_by: userId,
          reason,
          before: { ...currentRecord },
          after: { ...updatedRecord },
          corrected_at: new Date().toISOString()
        };

        const auditLog = {
          audit_id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          occurred_at: new Date().toISOString(),
          actor_user_id: userId,
          actor_role: 'FACTORY_ADMIN',
          action: 'CORRECT_PUNCH',
          target_type: 'attendance_records',
          target_id: recordId,
          detail: { reason }
        };

        recordsStore.put(updatedRecord);
        correctionsStore.put(correction);
        auditStore.put(auditLog);
      };

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async createRecord(record: Omit<AttendanceRecord, 'attendance_id' | 'created_at'>, userId: string, reason: string): Promise<void> {
    const db = await initDB();
    const attendanceId = `att_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newRecord: AttendanceRecord = {
      ...record,
      attendance_id: attendanceId,
      created_at: new Date().toISOString()
    };

    return new Promise((resolve, reject) => {
      const tx = db.transaction(['attendance_records', 'attendance_corrections', 'audit_logs'], 'readwrite');
      const recordsStore = tx.objectStore('attendance_records');
      const correctionsStore = tx.objectStore('attendance_corrections');
      const auditStore = tx.objectStore('audit_logs');

      const correction: AttendanceCorrection = {
        correction_id: `corr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        attendance_id: attendanceId,
        corrected_by: userId,
        reason,
        after: { ...newRecord },
        corrected_at: new Date().toISOString()
      };

      const auditLog = {
        audit_id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        occurred_at: new Date().toISOString(),
        actor_user_id: userId,
        actor_role: 'FACTORY_ADMIN',
        action: 'CREATE_PUNCH_MANUAL',
        target_type: 'attendance_records',
        target_id: attendanceId,
        detail: { reason }
      };

      recordsStore.put(newRecord);
      correctionsStore.put(correction);
      auditStore.put(auditLog);

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
}