import { openDatabase } from '../../../lib/db/indexedDb';
import { AttendanceRecord, AttendanceCorrection, PhotoBlob } from '../domain/types';

export interface AttendanceRepository {
  findFiltered(date?: string, contractorId?: string): Promise<AttendanceRecord[]>;
  getPhotoBlob(photoObjectId: string): Promise<Blob | null>;
  updateAttendance(
    attendanceId: string,
    clockedAt: string,
    reason: string,
    userId: string
  ): Promise<AttendanceRecord>;
}

export class IndexedDBAttendanceRepository implements AttendanceRepository {
  async findFiltered(date?: string, contractorId?: string): Promise<AttendanceRecord[]> {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('attendance_records', 'readonly');
      const store = tx.objectStore('attendance_records');
      const req = store.getAll();

      req.onsuccess = () => {
        let records: AttendanceRecord[] = req.result || [];

        if (date && date.trim() !== '') {
          records = records.filter((r) => r.clocked_at.startsWith(date));
        }

        if (contractorId && contractorId !== 'all') {
          records = records.filter((r) => r.contractor_id === contractorId);
        }

        records.sort((a, b) => new Date(b.clocked_at).getTime() - new Date(a.clocked_at).getTime());

        resolve(records);
      };

      req.onerror = () => reject(req.error);
    });
  }

  async getPhotoBlob(photoObjectId: string): Promise<Blob | null> {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('photo_blobs', 'readonly');
      const store = tx.objectStore('photo_blobs');
      const req = store.get(photoObjectId);

      req.onsuccess = () => {
        const result = req.result as PhotoBlob | undefined;
        resolve(result ? result.blob : null);
      };

      req.onerror = () => reject(req.error);
    });
  }

  async updateAttendance(
    attendanceId: string,
    clockedAt: string,
    reason: string,
    userId: string
  ): Promise<AttendanceRecord> {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['attendance_records', 'attendance_corrections'], 'readwrite');
      const recordsStore = tx.objectStore('attendance_records');
      const correctionsStore = tx.objectStore('attendance_corrections');

      const getReq = recordsStore.get(attendanceId);

      getReq.onsuccess = () => {
        const record = getReq.result as AttendanceRecord | undefined;
        if (!record) {
          reject(new Error('Record not found'));
          return;
        }

        const before = { ...record };
        const afterClockedAt = new Date(clockedAt).toISOString();

        const updatedRecord: AttendanceRecord = {
          ...record,
          clocked_at: afterClockedAt,
        };

        const correction: AttendanceCorrection = {
          correction_id: crypto.randomUUID(),
          attendance_id: attendanceId,
          corrected_by: userId,
          reason: reason,
          before: before,
          after: { clocked_at: afterClockedAt },
          corrected_at: new Date().toISOString(),
        };

        const putRecordReq = recordsStore.put(updatedRecord);
        const putCorrectionReq = correctionsStore.put(correction);

        let recordSaved = false;
        let correctionSaved = false;

        const checkComplete = () => {
          if (recordSaved && correctionSaved) {
            resolve(updatedRecord);
          }
        };

        putRecordReq.onsuccess = () => {
          recordSaved = true;
          checkComplete();
        };

        putCorrectionReq.onsuccess = () => {
          correctionSaved = true;
          checkComplete();
        };

        putRecordReq.onerror = () => reject(putRecordReq.error);
        putCorrectionReq.onerror = () => reject(putCorrectionReq.error);
      };

      getReq.onerror = () => reject(getReq.error);
    });
  }
}