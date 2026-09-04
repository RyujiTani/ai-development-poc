import { Result } from '../../../lib/error/appError';
import { logger } from '../../../lib/logger/logger';
import { AttendanceRepository, AttendanceRecord, AttendanceCorrection } from '../repository/attendanceRepository';
import { PunchType } from '../store/useAttendanceStore';

export interface CorrectAttendanceParams {
  attendanceId?: string; // 既存打刻修正の場合は必須
  workerId: string;
  contractorId: string;
  punchType: PunchType;
  clockedAt: string; // ISO8601
  reason: string;
  correctedBy: string; // user_id
}

export class CorrectAttendanceUseCase {
  constructor(private attendanceRepository: AttendanceRepository) {}

  async execute(params: CorrectAttendanceParams): Promise<Result<{ correctionId: string }>> {
    try {
      logger.info('correct_attendance_attempt', {
        attendance_id: params.attendanceId,
        worker_id: params.workerId,
        punch_type: params.punchType,
      });

      if (!params.reason.trim()) {
        return {
          success: false,
          error: { code: 'INVALID_ARGUMENT', message: '修正理由は必須入力です。' },
        };
      }

      const now = new Date().toISOString();
      const correctionId = crypto.randomUUID();

      let beforeRecord: AttendanceRecord | undefined = undefined;
      let updatedRecord: AttendanceRecord;

      if (params.attendanceId) {
        // 既存の打刻の修正
        const records = await this.attendanceRepository.findRecordsByWorkerId(params.workerId);
        beforeRecord = records.find((r) => r.attendance_id === params.attendanceId);

        if (!beforeRecord) {
          return {
            success: false,
            error: { code: 'NOT_FOUND', message: '修正対象の打刻データが見つかりません。' },
          };
        }

        updatedRecord = {
          ...beforeRecord,
          punch_type: params.punchType,
          clocked_at: params.clockedAt,
        };
      } else {
        // 新規手動登録
        updatedRecord = {
          attendance_id: crypto.randomUUID(),
          worker_id: params.workerId,
          contractor_id: params.contractorId,
          punch_type: params.punchType,
          clocked_at: params.clockedAt,
          punched_by: params.correctedBy,
          photo_object_id: 'MANUAL_ENTRY', // 手動登録用ダミーID
          created_at: now,
        };
      }

      const correction: AttendanceCorrection = {
        correction_id: correctionId,
        attendance_id: params.attendanceId || updatedRecord.attendance_id,
        corrected_by: params.correctedBy,
        reason: params.reason,
        before: beforeRecord ? {
          punch_type: beforeRecord.punch_type,
          clocked_at: beforeRecord.clocked_at,
        } : undefined,
        after: {
          punch_type: updatedRecord.punch_type,
          clocked_at: updatedRecord.clocked_at,
        },
        corrected_at: now,
      };

      await this.attendanceRepository.saveCorrection(correction, updatedRecord, !params.attendanceId);

      logger.info('correct_attendance_success', {
        correction_id: correctionId,
        attendance_id: updatedRecord.attendance_id,
      });

      return {
        success: true,
        value: { correctionId },
      };
    } catch (error) {
      logger.error('correct_attendance_failed', error, {
        worker_id: params.workerId,
      });
      return {
        success: false,
        error: {
          code: 'SYSTEM_ERROR',
          message: '打刻修正データの保存に失敗しました。',
        },
      };
    }
  }
}