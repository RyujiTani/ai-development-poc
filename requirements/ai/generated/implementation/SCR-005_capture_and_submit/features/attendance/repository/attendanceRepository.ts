import { openDB } from '../../../lib/db/indexedDB';
import { AttendanceRecord, PhotoBlob, AuditLog } from '../domain/types';

export interface IAttendanceRepository {
  savePunch(params: {
    workerIds: string[];
    contractorId: string;
    punchType: 'CLOCK_IN' | 'CLOCK_OUT';
    photo: Blob;
    punchedBy: string;
    geo?: { lat: number; lng: number };
    punchedAt: string;
  }): Promise<{ success: boolean; attendanceIds: string[] }>;
}

export class AttendanceRepository implements IAttendanceRepository {
  async savePunch(params: {
    workerIds: string[];
    contractorId: string;
    punchType: 'CLOCK_IN' | 'CLOCK_OUT';
    photo: Blob;
    punchedBy: string;
    geo?: { lat: number; lng: number };
    punchedAt: string;
  }): Promise<{ success: boolean; attendanceIds: string[] }> {
    const db = await openDB();
    
    const photoObjectId = typeof crypto !== 'undefined' && crypto.randomUUID 
      ? crypto.randomUUID() 
      : Math.random().toString(36).substring(2) + Date.now().toString(36);

    const photoRecord: PhotoBlob = {
      photo_object_id: photoObjectId,
      blob: params.photo,
      content_type: params.photo.type || 'image/jpeg',
      byte_size: params.photo.size,
      uploaded_by: params.punchedBy,
      uploaded_at: params.punchedAt
    };

    const attendanceRecords: AttendanceRecord[] = params.workerIds.map((workerId) => ({
      attendance_id: typeof crypto !== 'undefined' && crypto.randomUUID 
        ? crypto.randomUUID() 
        : Math.random().toString(36).substring(2) + Date.now().toString(36),
      worker_id: workerId,
      contractor_id: params.contractorId,
      punch_type: params.punchType,
      clocked_at: params.punchedAt,
      punched_by: params.punchedBy,
      geo: params.geo,
      photo_object_id: photoObjectId,
      created_at: params.punchedAt
    }));

    const auditLog: AuditLog = {
      audit_id: typeof crypto !== 'undefined' && crypto.randomUUID 
        ? crypto.randomUUID() 
        : Math.random().toString(36).substring(2) + Date.now().toString(36),
      occurred_at: params.punchedAt,
      actor_user_id: params.punchedBy,
      actor_role: 'CONTRACTOR_MANAGER',
      action: 'PUNCH',
      target_type: 'attendance_records',
      detail: {
        worker_count: params.workerIds.length,
        punch_type: params.punchType,
        photo_object_id: photoObjectId
      }
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['photo_blobs', 'attendance_records', 'audit_logs'], 'readwrite');

      transaction.onerror = () => {
        reject(transaction.error || new Error('Database transaction write failed'));
      };

      const photoStore = transaction.objectStore('photo_blobs');
      const attendanceStore = transaction.objectStore('attendance_records');
      const auditStore = transaction.objectStore('audit_logs');

      photoStore.put(photoRecord);

      const attendanceIds: string[] = [];
      attendanceRecords.forEach((record) => {
        attendanceStore.put(record);
        attendanceIds.push(record.attendance_id);
      });

      auditStore.put(auditLog);

      transaction.oncomplete = () => {
        resolve({ success: true, attendanceIds });
      };
    });
  }
}
"
    },
    {