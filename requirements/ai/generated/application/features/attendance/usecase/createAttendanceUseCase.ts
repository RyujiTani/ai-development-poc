import { Result } from '../../../lib/error/appError';
import { logger } from '../../../lib/logger/logger';
import { AttendanceRepository, AttendanceRecord, PhotoBlob } from '../repository/attendanceRepository';
import { PunchType } from '../store/useAttendanceStore';

export interface CreateAttendanceParams {
  workerIds: string[];
  contractorId: string;
  punchType: PunchType;
  photo: Blob;
  punchedBy: string;
  geo?: { lat: number; lng: number };
}

export interface CreateAttendanceResult {
  photoObjectId: string;
  attendanceIds: string[];
}

export class CreateAttendanceUseCase {
  constructor(private attendanceRepository: AttendanceRepository) {}

  async execute(params: CreateAttendanceParams): Promise<Result<CreateAttendanceResult>> {
    try {
      logger.info('create_attendance_attempt', {
        worker_count: params.workerIds.length,
        punch_type: params.punchType,
        punched_by: params.punchedBy,
      });

      if (params.workerIds.length === 0) {
        return {
          success: false,
          error: { code: 'INVALID_ARGUMENT', message: '打刻対象の作業員が選択されていません。' },
        };
      }

      const photoObjectId = crypto.randomUUID();
      const now = new Date().toISOString();

      // 共通の写真オブジェクト
      const photoRecord: PhotoBlob = {
        photo_object_id: photoObjectId,
        blob: params.photo,
        content_type: params.photo.type,
        byte_size: params.photo.size,
        uploaded_by: params.punchedBy,
        uploaded_at: now,
      };

      // 各作業員の打刻レコード
      const attendanceRecords: AttendanceRecord[] = params.workerIds.map((workerId) => ({
        attendance_id: crypto.randomUUID(),
        worker_id: workerId,
        contractor_id: params.contractorId,
        punch_type: params.punchType,
        clocked_at: now,
        punched_by: params.punchedBy,
        geo: params.geo,
        photo_object_id: photoObjectId,
        created_at: now,
      }));

      // IndexedDBへ保存
      await this.attendanceRepository.savePunch(attendanceRecords, photoRecord);

      logger.info('create_attendance_success', {
        photo_object_id: photoObjectId,
        attendance_count: attendanceRecords.length,
      });

      return {
        success: true,
        value: {
          photoObjectId,
          attendanceIds: attendanceRecords.map((r) => r.attendance_id),
        },
      };
    } catch (error) {
      logger.error('create_attendance_system_error', error, {
        punch_type: params.punchType,
      });
      return {
        success: false,
        error: {
          code: 'SYSTEM_ERROR',
          message: '打刻の保存に失敗しました。IndexedDBの容量制限等を確認してください。',
        },
      };
    }
  }
}