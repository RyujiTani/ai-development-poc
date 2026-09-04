import { Result, AttendanceRecord, Contractor, Worker } from '../domain/types';
import { AttendanceRepository } from '../repository/attendanceRepository';
import { ContractorRepository } from '../../contractor/repository/contractorRepository';
import { WorkerRepository } from '../../worker/repository/workerRepository';
import { logger } from '../../../lib/logger/logger';

export class AttendanceUseCase {
  constructor(
    private attendanceRepo: AttendanceRepository,
    private contractorRepo: ContractorRepository,
    private workerRepo: WorkerRepository
  ) {}

  async getAttendanceHistory(
    date?: string,
    contractorId?: string
  ): Promise<Result<{ records: AttendanceRecord[]; contractors: Contractor[]; workers: Worker[] }>> {
    try {
      logger.info('getAttendanceHistory_start', { date, contractorId });

      const [records, contractors, workers] = await Promise.all([
        this.attendanceRepo.findFiltered(date, contractorId),
        this.contractorRepo.findAll(),
        this.workerRepo.findAll(),
      ]);

      logger.info('getAttendanceHistory_success', {
        record_count: records.length,
        contractor_count: contractors.length,
        worker_count: workers.length,
      });

      return {
        success: true,
        value: { records, contractors, workers },
      };
    } catch (e: any) {
      logger.error('getAttendanceHistory_failed', { error: e.message });
      return {
        success: false,
        error: { code: 'FETCH_ERROR', message: e.message || 'データ取得に失敗しました。' },
      };
    }
  }

  async getPhotoUrl(photoObjectId: string): Promise<Result<string>> {
    try {
      const blob = await this.attendanceRepo.getPhotoBlob(photoObjectId);
      if (!blob) {
        return {
          success: false,
          error: { code: 'NOT_FOUND', message: '写真が見つかりませんでした。' },
        };
      }
      const url = URL.createObjectURL(blob);
      return { success: true, value: url };
    } catch (e: any) {
      return {
        success: false,
        error: { code: 'BLOB_ERROR', message: e.message || '写真URL生成に失敗しました。' },
      };
    }
  }

  async correctPunch(
    attendanceId: string,
    clockedAt: string,
    reason: string,
    userId: string
  ): Promise<Result<AttendanceRecord>> {
    try {
      if (!reason || !reason.trim()) {
        return {
          success: false,
          error: { code: 'VALIDATION_ERROR', message: '修正理由は必須項目です。' },
        };
      }

      logger.info('correctPunch_start', { attendanceId, clockedAt, userId });

      const updated = await this.attendanceRepo.updateAttendance(attendanceId, clockedAt, reason, userId);

      logger.info('correctPunch_success', { attendanceId });

      return { success: true, value: updated };
    } catch (e: any) {
      logger.error('correctPunch_failed', { attendanceId, error: e.message });
      return {
        success: false,
        error: { code: 'CORRECTION_ERROR', message: e.message || '打刻情報の修正に失敗しました。' },
      };
    }
  }
}