import { AttendanceRecord, PhotoBlob, PunchType, AuditLog } from '../domain/types';
import { AttendanceRepository } from '../repository/attendanceRepository';

export interface PunchInput {
  workerIds: string[];
  contractorId: string;
  punchType: PunchType;
  photoBlob: Blob;
  punchedBy: string; // user_id
  geo?: { lat: number; lng: number };
}

export interface PunchResult {
  success: boolean;
  attendanceIds: string[];
}

export class PunchUseCase {
  constructor(private attendanceRepository: AttendanceRepository) {}

  async execute(input: PunchInput): Promise<PunchResult> {
    if (input.workerIds.length === 0) {
      throw new Error('打刻対象の作業員が選択されていません。');
    }

    const photoObjectId = crypto.randomUUID();
    const now = new Date().toISOString();

    // 1. 写真データの構築
    const photo: PhotoBlob = {
      photo_object_id: photoObjectId,
      blob: input.photoBlob,
      content_type: 'image/jpeg',
      byte_size: input.photoBlob.size,
      uploaded_by: input.punchedBy,
      uploaded_at: now,
    };

    // 2. 打刻実績（各作業員分）の構築
    const records: AttendanceRecord[] = input.workerIds.map((workerId) => ({
      attendance_id: crypto.randomUUID(),
      worker_id: workerId,
      contractor_id: input.contractorId,
      punch_type: input.punchType,
      clocked_at: now,
      punched_by: input.punchedBy,
      geo: input.geo,
      photo_object_id: photoObjectId,
      created_at: now,
    }));

    // 3. 監査ログ（モック）の構築
    const auditLog: AuditLog = {
      audit_id: crypto.randomUUID(),
      occurred_at: now,
      actor_user_id: input.punchedBy,
      actor_role: 'CONTRACTOR_MANAGER',
      action: 'PUNCH',
      target_type: 'attendance_records',
      target_id: photoObjectId,
      detail: {
        worker_count: input.workerIds.length,
        punch_type: input.punchType,
        has_geo: !!input.geo,
      },
    };

    // 4. リポジトリへの永続化
    await this.attendanceRepository.savePunch(records, photo, auditLog);

    return {
      success: true,
      attendanceIds: records.map((r) => r.attendance_id),
    };
  }
}