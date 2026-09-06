import { AttendanceRepository } from '../repository/attendanceRepository';
import { AttendanceRecord } from '../domain/types';
import { Result, AppError } from '@/lib/core/result';
import { logger } from '@/lib/logger';

export class GetAttendanceRecordUseCase {
  constructor(private attendanceRepository: AttendanceRepository) {}

  async execute(attendanceId: string, contractorId: string): Promise<Result<AttendanceRecord, AppError>> {
    try {
      const record = await this.attendanceRepository.findRecordById(attendanceId);
      if (!record) {
        return {
          success: false,
          error: new AppError('打刻記録が見つかりません。', 'NOT_FOUND'),
        };
      }
      if (record.contractor_id !== contractorId) {
        return {
          success: false,
          error: new AppError('この打刻記録を閲覧する権限がありません。', 'UNAUTHORIZED'),
        };
      }
      return { success: true, value: record };
    } catch (e) {
      logger.error('GET_ATTENDANCE_RECORD_ERROR', e, { attendanceId });
      return {
        success: false,
        error: new AppError('打刻情報の取得に失敗しました。', 'DATABASE_ERROR'),
      };
    }
  }
}