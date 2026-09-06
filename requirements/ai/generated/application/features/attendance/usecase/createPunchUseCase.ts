import { AttendanceRepository } from '../repository/attendanceRepository';
import { AttendanceRecord, PhotoBlob } from '../domain/types';
import { Result, AppError } from '@/lib/core/result';
import { logger } from '@/lib/logger';
import { PunchType } from '../store/useAttendanceStore';

export interface CreatePunchInput {
  workerIds: string[];
  contractorId: string;
  punchType: PunchType;
  photo: Blob;
  punchedBy: string;
  punchedAt: string;
}

export class CreatePunchUseCase {
  constructor(private attendanceRepository: AttendanceRepository) {}

  async execute(input: CreatePunchInput): Promise<Result<void, AppError>> {
    try {
      const photoObjectId = `pho-${crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2)}`;
      
      const photoBlob: PhotoBlob = {
        photo_object_id: photoObjectId,
        blob: input.photo,
        content_type: input.photo.type || 'image/jpeg',
        byte_size: input.photo.size,
        uploaded_by: input.punchedBy,
        uploaded_at: input.punchedAt,
      };

      await this.attendanceRepository.savePhotoBlob(photoBlob);

      for (const workerId of input.workerIds) {
        const attendanceId = `att-${crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2)}`;
        const record: AttendanceRecord = {
          attendance_id: attendanceId,
          worker_id: workerId,
          contractor_id: input.contractorId,
          punch_type: input.punchType,
          clocked_at: input.punchedAt,
          punched_by: input.punchedBy,
          photo_object_id: photoObjectId,
          created_at: input.punchedAt,
        };
        await this.attendanceRepository.saveRecord(record);
      }

      logger.info('PUNCH_SUCCESS', {
        worker_count: input.workerIds.length,
        punch_type: input.punchType,
        photo_object_id: photoObjectId,
      });

      return { success: true, value: undefined };
    } catch (e) {
      logger.error('PUNCH_SYSTEM_ERROR', e);
      return {
        success: false,
        error: new AppError('保存に失敗しました。もう一度お試しください。', 'DATABASE_ERROR'),
      };
    }
  }
}