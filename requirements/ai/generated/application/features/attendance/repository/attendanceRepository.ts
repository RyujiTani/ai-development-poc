import { initDB } from '@/lib/db/indexedDB';
import { AttendanceRecord, PhotoBlob, PunchType, AttendanceCorrection, Contractor, Worker } from '../domain/types';

export const attendanceRepository = {
  async savePunch(params: {
    workerIds: string[];
    contractorId: string;
    punchType: PunchType;
    photo: Blob;
    punchedBy: string;
    punchedAt: string;
  }): Promise<{ success: boolean; attendanceIds: string[] }> {
    const db = await initDB();
    const tx = db.transaction(['photo_blobs', 'attendance_records'], 'readwrite');

    const photoObjectId =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : Math.random().toString(36).substring(2);

    const photoRecord: PhotoBlob = {
      photo_object_id: photoObjectId,
      blob: params.photo,
      content_type: params.photo.type || 'image/jpeg',
      byte_size: params.photo.size,
      uploaded_by: params.punchedBy,
      uploaded_at: params.punchedAt,
    };

    await tx.objectStore('photo_blobs').put(photoRecord);

    const attendanceIds: string[] = [];
    for (const workerId of params.workerIds) {
      const attendanceId =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : Math.random().toString(36).substring(2);

      const record: AttendanceRecord = {
        attendance_id: attendanceId,
        worker_id: workerId,
        contractor_id: params.contractorId,
        punch_type: params.punchType,
        clocked_at: params.punchedAt,
        punched_by: params.punchedBy,
        photo_object_id: photoObjectId,
        created_at: params.punchedAt,
      };

      await tx.objectStore('attendance_records').put(record);
      attendanceIds.push(attendanceId);
    }

    await tx.done;
    return { success: true, attendanceIds };
  },

  async getAttendanceRecord(attendanceId: string): Promise<AttendanceRecord | null> {
    const db = await initDB();
    const tx = db.transaction('attendance_records', 'readonly');
    const store = tx.objectStore('attendance_records');
    const record = (await store.get(attendanceId)) as AttendanceRecord | undefined;
    return record || null;
  },

  async saveCorrection(params: {
    attendanceId?: string;
    workerId: string;
    contractorId: string;
    punchType: PunchType;
    clockedAt: string;
    reason: string;
    correctedBy: string;
  }): Promise<{ success: boolean; correctionId: string }> {
    const db = await initDB();
    const tx = db.transaction(['attendance_records', 'attendance_corrections', 'audit_logs'], 'readwrite');

    const now = new Date().toISOString();
    const correctionId = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : Math.random().toString(36).substring(2);

    let beforeRecord: Partial<AttendanceRecord> | undefined = undefined;
    let afterRecord: Partial<AttendanceRecord> = {
      worker_id: params.workerId,
      contractor_id: params.contractorId,
      punch_type: params.punchType,
      clocked_at: params.clockedAt,
    };

    let targetAttendanceId = params.attendanceId;

    if (params.attendanceId) {
      const recordStore = tx.objectStore('attendance_records');
      const existing = (await recordStore.get(params.attendanceId)) as AttendanceRecord | undefined;
      if (!existing) {
        throw new Error('対象の打刻記録が見つかりません');
      }

      beforeRecord = {
        attendance_id: existing.attendance_id,
        worker_id: existing.worker_id,
        contractor_id: existing.contractor_id,
        punch_type: existing.punch_type,
        clocked_at: existing.clocked_at,
        photo_object_id: existing.photo_object_id,
      };

      const updatedRecord: AttendanceRecord = {
        ...existing,
        punch_type: params.punchType,
        clocked_at: params.clockedAt,
      };

      await recordStore.put(updatedRecord);
      afterRecord = {
        ...afterRecord,
        attendance_id: params.attendanceId,
        photo_object_id: existing.photo_object_id,
      };
    } else {
      targetAttendanceId = typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : Math.random().toString(36).substring(2);

      const newRecord: AttendanceRecord = {
        attendance_id: targetAttendanceId,
        worker_id: params.workerId,
        contractor_id: params.contractorId,
        punch_type: params.punchType,
        clocked_at: params.clockedAt,
        punched_by: params.correctedBy,
        photo_object_id: 'MANUAL',
        created_at: now,
      };

      await tx.objectStore('attendance_records').put(newRecord);
      afterRecord = {
        ...afterRecord,
        attendance_id: targetAttendanceId,
        photo_object_id: 'MANUAL',
      };
    }

    const correctionRecord: AttendanceCorrection = {
      correction_id: correctionId,
      attendance_id: targetAttendanceId,
      corrected_by: params.correctedBy,
      reason: params.reason,
      before: beforeRecord,
      after: afterRecord,
      corrected_at: now,
    };

    await tx.objectStore('attendance_corrections').put(correctionRecord);

    const auditId = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : Math.random().toString(36).substring(2);

    await tx.objectStore('audit_logs').put({
      audit_id: auditId,
      occurred_at: now,
      actor_user_id: params.correctedBy,
      actor_role: 'FACTORY_ADMIN',
      action: params.attendanceId ? 'CORRECT_PUNCH' : 'CREATE_MANUAL_PUNCH',
      target_type: 'attendance_records',
      target_id: targetAttendanceId,
      detail: {
        reason: params.reason,
        worker_id: params.workerId,
      },
    });

    await tx.done;
    return { success: true, correctionId };
  },

  async getPhotoBlob(photoObjectId: string): Promise<Blob | null> {
    const db = await initDB();
    const tx = db.transaction('photo_blobs', 'readonly');
    const store = tx.objectStore('photo_blobs');
    const record = (await store.get(photoObjectId)) as PhotoBlob | undefined;
    return record ? record.blob : null;
  },

  async getActiveContractors(): Promise<Contractor[]> {
    const db = await initDB();
    const tx = db.transaction('contractors', 'readonly');
    const store = tx.objectStore('contractors');
    const list = (await store.getAll()) as Contractor[];
    return list.filter((c) => c.status === 'ACTIVE');
  },

  async getAttendanceHistory(params: {
    date?: string;
    contractorId?: string;
  }): Promise<Array<AttendanceRecord & { worker_name: string; contractor_name: string }>> {
    const db = await initDB();

    const attTx = db.transaction('attendance_records', 'readonly');
    const attStore = attTx.objectStore('attendance_records');
    const allAttendance = (await attStore.getAll()) as AttendanceRecord[];

    const workerTx = db.transaction('workers', 'readonly');
    const workerStore = workerTx.objectStore('workers');
    const allWorkers = (await workerStore.getAll()) as Worker[];
    const workerMap = new Map(allWorkers.map((w) => [w.worker_id, w]));

    const contTx = db.transaction('contractors', 'readonly');
    const contStore = contTx.objectStore('contractors');
    const allContractors = (await contStore.getAll()) as Contractor[];
    const contractorMap = new Map(allContractors.map((c) => [c.contractor_id, c]));

    let filtered = allAttendance.map((record) => {
      const worker = workerMap.get(record.worker_id);
      const contractor = contractorMap.get(record.contractor_id);
      return {
        ...record,
        worker_name: worker ? worker.name : '不明な作業員',
        contractor_name: contractor ? contractor.name : '不明な外注先',
      };
    });

    if (params.date) {
      filtered = filtered.filter((record) => {
        const recordDate = new Date(record.clocked_at);
        const utc = recordDate.getTime() + recordDate.getTimezoneOffset() * 60000;
        const jst = new Date(utc + 3600000 * 9);
        const y = jst.getFullYear();
        const m = String(jst.getMonth() + 1).padStart(2, '0');
        const d = String(jst.getDate()).padStart(2, '0');
        const recordDayStr = `${y}-${m}-${d}`;
        return recordDayStr === params.date;
      });
    }

    if (params.contractorId && params.contractorId !== 'all') {
      filtered = filtered.filter((record) => record.contractor_id === params.contractorId);
    }

    filtered.sort((a, b) => new Date(b.clocked_at).getTime() - new Date(a.clocked_at).getTime());

    return filtered;
  },

  async getAllContractors(): Promise<Contractor[]> {
    const db = await initDB();
    const tx = db.transaction('contractors', 'readonly');
    const store = tx.objectStore('contractors');
    const list = (await store.getAll()) as Contractor[];
    return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  async createContractor(name: string): Promise<Contractor> {
    const db = await initDB();
    const tx = db.transaction('contractors', 'readwrite');
    const store = tx.objectStore('contractors');
    const contractor_id = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : Math.random().toString(36).substring(2);
    const now = new Date().toISOString();
    const newContractor: Contractor = {
      contractor_id,
      name,
      status: 'ACTIVE',
      created_at: now,
      updated_at: now,
    };
    await store.put(newContractor);
    await tx.done;
    return newContractor;
  },

  async updateContractor(contractor_id: string, name: string, status: 'ACTIVE' | 'INACTIVE'): Promise<Contractor> {
    const db = await initDB();
    const tx = db.transaction('contractors', 'readwrite');
    const store = tx.objectStore('contractors');
    const existing = (await store.get(contractor_id)) as Contractor | undefined;
    if (!existing) {
      throw new Error('外注先企業が見つかりません');
    }
    const updated: Contractor = {
      ...existing,
      name,
      status,
      updated_at: new Date().toISOString(),
    };
    await store.put(updated);
    await tx.done;
    return updated;
  },

  async deleteContractor(contractor_id: string): Promise<{ success: boolean }> {
    const db = await initDB();
    const tx = db.transaction('contractors', 'readwrite');
    const store = tx.objectStore('contractors');
    await store.delete(contractor_id);
    await tx.done;
    return { success: true };
  }
};