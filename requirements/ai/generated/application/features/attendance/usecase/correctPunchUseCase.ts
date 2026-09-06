import { AttendanceRepository } from '../repository/attendanceRepository';
import { AttendanceRecord, AttendanceCorrection } from '../domain/types';
import { Result, AppError } from '@/lib/core/result';
import { logger } from '@/lib/logger';
import { initDB } from '@/lib/db';

export interface CorrectPunchInput {
  attendanceId?: string;
  workerId: string;
  contractorId: string;
  punchType: 'CLOCK_IN' | 'CLOCK_OUT';
  clockedAt: string;
  reason: string;
  correctedBy: string;
  isAdmin?: boolean; // 工場管理者からの手動登録・修正識別フラグ
}

export class CorrectPunchUseCase {
  constructor(private attendanceRepository: AttendanceRepository) {}

  async execute(input: CorrectPunchInput): Promise<Result<void, AppError>> {
    try {
      let beforeRecord: AttendanceRecord | null = null;
      let targetAttendanceId = input.attendanceId;

      if (targetAttendanceId) {
        beforeRecord = await this.attendanceRepository.findRecordById(targetAttendanceId);
        if (!beforeRecord) {
          return {
            success: false,
            error: new AppError('対象の打刻記録が見つかりません。', 'NOT_FOUND'),
          };
        }
        // 管理者でなく、かつ自社打刻でない場合はエラー
        if (!input.isAdmin && beforeRecord.contractor_id !== input.contractorId) {
          return {
            success: false,
            error: new AppError('この打刻記録を修正する権限がありません。', 'UNAUTHORIZED'),
          };
        }
      }

      const now = new Date().toISOString();
      const correctionId = `cor-${crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2)}`;

      if (!targetAttendanceId) {
        targetAttendanceId = `att-${crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2)}`;
      }

      const photoObjectId = beforeRecord?.photo_object_id || '';
      // 管理者の場合、新規手動登録時は input.contractorId を使用。既存レコード修正なら既存の contractor_id を使用
      const finalContractorId = beforeRecord?.contractor_id || input.contractorId;

      const updatedRecord: AttendanceRecord = {
        attendance_id: targetAttendanceId,
        worker_id: input.workerId,
        contractor_id: finalContractorId,
        punch_type: input.punchType,
        clocked_at: input.clockedAt,
        punched_by: input.correctedBy,
        photo_object_id: photoObjectId,
        created_at: beforeRecord?.created_at || now,
      };

      await this.attendanceRepository.saveRecord(updatedRecord);

      const correction: AttendanceCorrection = {
        correction_id: correctionId,
        attendance_id: targetAttendanceId,
        corrected_by: input.correctedBy,
        reason: input.reason,
        before: beforeRecord ? { ...beforeRecord } : undefined,
        after: { ...updatedRecord },
        corrected_at: now,
      };
      await this.attendanceRepository.saveCorrection(correction);

      // 監査ログの書き込み
      try {
        const db = await initDB();
        const auditTx = db.transaction('audit_logs', 'readwrite');
        const auditStore = auditTx.objectStore('audit_logs');
        const auditId = `aud-${crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2)}`;
        await auditStore.put({
          audit_id: auditId,
          occurred_at: now,
          actor_user_id: input.correctedBy,
          actor_role: input.isAdmin ? 'FACTORY_ADMIN' : 'CONTRACTOR_MANAGER',
          action: input.attendanceId ? 'PUNCH_CORRECTION' : 'PUNCH_MANUAL_CREATE',
          target_type: 'attendance_records',
          target_id: targetAttendanceId,
          detail: {
            reason: input.reason,
            worker_id: input.workerId,
            punch_type: input.punchType,
          }
        });
        await auditTx.done;
      } catch (auditError) {
        logger.error('PUNCH_CORRECT_AUDIT_LOG_ERROR', auditError);
      }

      logger.info('PUNCH_CORRECT_SUCCESS', {
        correction_id: correctionId,
        attendance_id: targetAttendanceId,
        worker_id: input.workerId,
        punch_type: input.punchType,
      });

      return { success: true, value: undefined };
    } catch (e) {
      logger.error('PUNCH_CORRECT_SYSTEM_ERROR', e);
      return {
        success: false,
        error: new AppError('保存に失敗しました。もう一度お試しください。', 'DATABASE_ERROR'),
      };
    }
  }
}