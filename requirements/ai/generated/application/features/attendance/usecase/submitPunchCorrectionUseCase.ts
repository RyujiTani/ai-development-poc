import { Result } from "@/lib/error/AppError";
import { logger } from "@/lib/logger/logger";
import { recordAuditLog } from "@/lib/db/auditLog";
import { AttendanceRecord } from "../domain/AttendanceRecord";
import { AttendanceCorrection } from "../domain/AttendanceCorrection";
import { IndexedDBAttendanceRepository } from "../repository/indexedDBAttendanceRepository";
import { PunchType } from "../store/attendanceStore";

export interface SubmitPunchCorrectionInput {
  attendanceId?: string; // 既存修正時は指定、新規時は undefined
  workerId: string;
  contractorId: string;
  punchType: PunchType;
  punchedAt: string;     // ISO8601 (日付・時刻選択から入力されたもの)
  reason: string;
  correctedBy: string;   // user_id
  actorRole?: 'FACTORY_ADMIN' | 'CONTRACTOR_MANAGER';
}

export interface SubmitPunchCorrectionResult {
  success: boolean;
  correctionId: string;
}

export async function submitPunchCorrectionUseCase(
  input: SubmitPunchCorrectionInput
): Promise<Result<SubmitPunchCorrectionResult>> {
  logger.info("SUBMIT_PUNCH_CORRECTION_ATTEMPT", {
    attendanceId: input.attendanceId,
    workerId: input.workerId,
    punchType: input.punchType,
    correctedBy: input.correctedBy,
  });

  try {
    const repo = new IndexedDBAttendanceRepository();
    const now = new Date().toISOString();
    const correctionId = crypto.randomUUID();

    let beforeRecord: AttendanceRecord | null = null;
    if (input.attendanceId) {
      beforeRecord = await repo.getRecordById(input.attendanceId);
    }

    const targetAttendanceId = input.attendanceId || crypto.randomUUID();

    // 更新または作成する打刻実績
    const afterRecord: AttendanceRecord = {
      attendance_id: targetAttendanceId,
      worker_id: input.workerId,
      contractor_id: input.contractorId,
      punch_type: input.punchType,
      clocked_at: input.punchedAt,
      punched_by: input.correctedBy,
      photo_object_id: beforeRecord?.photo_object_id || "MANUAL_CORRECTION",
      created_at: beforeRecord?.created_at || now,
    };

    const correction: AttendanceCorrection = {
      correction_id: correctionId,
      attendance_id: targetAttendanceId,
      corrected_by: input.correctedBy,
      reason: input.reason,
      before: beforeRecord ? { ...beforeRecord } : undefined,
      after: { ...afterRecord },
      corrected_at: now,
    };

    await repo.saveCorrection(correction, afterRecord);

    const actorRole = input.actorRole || "CONTRACTOR_MANAGER";

    // 監査ログに記録
    await recordAuditLog({
      actor_user_id: input.correctedBy,
      actor_role: actorRole,
      action: input.attendanceId ? "CORRECT_PUNCH" : "CREATE_MANUAL_PUNCH",
      target_type: "attendance_record",
      target_id: targetAttendanceId,
      detail: {
        reason: input.reason,
        punch_type: input.punchType,
      },
    });

    logger.info("SUBMIT_PUNCH_CORRECTION_SUCCESS", {
      correctionId,
      attendanceId: targetAttendanceId,
    });

    return {
      success: true,
      value: {
        success: true,
        correctionId,
      },
    };
  } catch (error) {
    logger.error("SUBMIT_PUNCH_CORRECTION_SYSTEM_ERROR", { error: String(error) });
    return {
      success: false,
      error: { code: "SYSTEM_ERROR", message: "送信に失敗しました。時間をおいて再度お試しください。" },
    };
  }
}