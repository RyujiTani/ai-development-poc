import { getDB } from '@/lib/db/idb';
import { AttendanceRecord, Contractor, Worker, AttendanceCorrection, AuditLog } from '../domain/types';

export interface EnrichedAttendanceRecord extends AttendanceRecord {
  worker_name: string;
  contractor_name: string;
}

export class AttendanceRepository {
  async getActiveContractors(): Promise<Contractor[]> {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('contractors', 'readonly');
      const store = tx.objectStore('contractors');
      const req = store.getAll();
      
      req.onsuccess = () => {
        const list = req.result as Contractor[];
        resolve(list.filter(c => c.status === 'ACTIVE'));
      };
      req.onerror = () => reject(req.error);
    });
  }

  async getAttendanceRecords(filterDate: string, contractorId: string | null): Promise<EnrichedAttendanceRecord[]> {
    const db = await getDB();

    const workersMap = await this.getWorkersMap(db);
    const contractorsMap = await this.getContractorsMap(db);

    return new Promise((resolve, reject) => {
      const tx = db.transaction('attendance_records', 'readonly');
      const store = tx.objectStore('attendance_records');
      const req = store.getAll();

      req.onsuccess = () => {
        const allRecords = req.result as AttendanceRecord[];
        
        const filtered = allRecords.filter(record => {
          // Date check (clocked_at is ISO8601)
          const recordDate = record.clocked_at.split('T')[0];
          if (recordDate !== filterDate) return false;
          
          // Contractor check
          if (contractorId && record.contractor_id !== contractorId) return false;
          
          return true;
        });

        const enriched: EnrichedAttendanceRecord[] = filtered.map(r => {
          const worker = workersMap.get(r.worker_id);
          const contractor = contractorsMap.get(r.contractor_id);
          return {
            ...r,
            worker_name: worker ? worker.name : '不明な作業員',
            contractor_name: contractor ? contractor.name : '不明な外注先'
          };
        });

        // Sort by clock time ascending
        enriched.sort((a, b) => a.clocked_at.localeCompare(b.clocked_at));

        resolve(enriched);
      };
      req.onerror = () => reject(req.error);
    });
  }

  async getPhotoBlob(photoObjectId: string): Promise<Blob | null> {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('photo_blobs', 'readonly');
      const store = tx.objectStore('photo_blobs');
      const req = store.get(photoObjectId);

      req.onsuccess = () => {
        if (req.result) {
          resolve((req.result as any).blob);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => reject(req.error);
    });
  }

  async updateAttendanceRecord(
    recordId: string,
    updatedFields: { clocked_at: string; punch_type: 'CLOCK_IN' | 'CLOCK_OUT' },
    reason: string,
    actorUserId: string
  ): Promise<void> {
    const db = await getDB();

    // 1. Get original record
    const original: AttendanceRecord = await new Promise((resolve, reject) => {
      const tx = db.transaction('attendance_records', 'readonly');
      const store = tx.objectStore('attendance_records');
      const req = store.get(recordId);
      req.onsuccess = () => {
        if (req.result) resolve(req.result);
        else reject(new Error('Record not found'));
      };
      req.onerror = () => reject(req.error);
    });

    const afterRecord: AttendanceRecord = {
      ...original,
      clocked_at: updatedFields.clocked_at,
      punch_type: updatedFields.punch_type
    };

    // 2. Perform transactional update
    const tx = db.transaction(['attendance_records', 'attendance_corrections', 'audit_logs'], 'readwrite');

    // Update attendance record
    tx.objectStore('attendance_records').put(afterRecord);

    // Add correction log
    const correction: AttendanceCorrection = {
      correction_id: `corr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      attendance_id: recordId,
      corrected_by: actorUserId,
      reason: reason,
      before: original,
      after: afterRecord,
      corrected_at: new Date().toISOString()
    };
    tx.objectStore('attendance_corrections').put(correction);

    // Add audit log
    const audit: AuditLog = {
      audit_id: `audit-${Date.now()}`,
      occurred_at: new Date().toISOString(),
      actor_user_id: actorUserId,
      actor_role: 'FACTORY_ADMIN',
      action: 'CORRECT_PUNCH',
      target_type: 'attendance_records',
      target_id: recordId,
      detail: { reason, before: original.clocked_at, after: afterRecord.clocked_at }
    };
    tx.objectStore('audit_logs').put(audit);

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  private async getWorkersMap(db: IDBDatabase): Promise<Map<string, Worker>> {
    return new Promise((resolve) => {
      const tx = db.transaction('workers', 'readonly');
      const req = tx.objectStore('workers').getAll();
      req.onsuccess = () => {
        const map = new Map<string, Worker>();
        (req.result as Worker[]).forEach(w => map.set(w.worker_id, w));
        resolve(map);
      };
      req.onerror = () => resolve(new Map());
    });
  }

  private async getContractorsMap(db: IDBDatabase): Promise<Map<string, Contractor>> {
    return new Promise((resolve) => {
      const tx = db.transaction('contractors', 'readonly');
      const req = tx.objectStore('contractors').getAll();
      req.onsuccess = () => {
        const map = new Map<string, Contractor>();
        (req.result as Contractor[]).forEach(c => map.set(c.contractor_id, c));
        resolve(map);
      };
      req.onerror = () => resolve(new Map());
    });
  }
}
