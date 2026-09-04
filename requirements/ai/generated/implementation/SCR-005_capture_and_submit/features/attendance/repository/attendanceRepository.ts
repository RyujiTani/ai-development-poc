import { AttendanceRecord, PhotoBlob, AuditLog } from '../domain/types';
import { openDB } from '../../../lib/db/indexedDb';

export interface AttendanceRepository {
  savePunch(records: AttendanceRecord[], photo: PhotoBlob, auditLog?: AuditLog): Promise<void>;
}

export class IndexedDBAttendanceRepository implements AttendanceRepository {
  async savePunch(records: AttendanceRecord[], photo: PhotoBlob, auditLog?: AuditLog): Promise<void> {
    const db = await openDB();

    return new Promise((resolve, reject) => {
      const stores = ['attendance_records', 'photo_blobs'];
      if (auditLog) {
        stores.push('audit_logs');
      }

      const tx = db.transaction(stores, 'readwrite');

      tx.oncomplete = () => {
        resolve();
      };

      tx.onerror = () => {
        reject(tx.error);
      };

      // 1. 写真の保存
      const photoStore = tx.objectStore('photo_blobs');
      photoStore.put(photo);

      // 2. 打刻実績の保存
      const attendanceStore = tx.objectStore('attendance_records');
      for (const record of records) {
        attendanceStore.put(record);
      }

      // 3. 監査ログの保存 (オプション)
      if (auditLog) {
        const auditStore = tx.objectStore('audit_logs');
        auditStore.put(auditLog);
      }
    });
  }
}