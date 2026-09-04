import { Result } from '../../../lib/error/appError';
import { AttendanceRecord, AttendanceRepository } from '../repository/attendanceRepository';
import { logger } from '../../../lib/logger/logger';

export class GetWorkerAttendanceUseCase {
  constructor(private attendanceRepository: AttendanceRepository) {}

  async execute(workerId: string): Promise<Result<AttendanceRecord[]>> {
    try {
      logger.info('get_worker_attendance_attempt', { worker_id: workerId });
      const records = await this.attendanceRepository.findRecordsByWorkerId(workerId);
      return { success: true, value: records };
    } catch (error) {
      logger.error('get_worker_attendance_failed', error, { worker_id: workerId });
      return {
        success: false,
        error: { code: 'SYSTEM_ERROR', message: '打刻履歴の取得に失敗しました。' },
      };
    }
  }
}