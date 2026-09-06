import { Result } from "@/lib/error/AppError";
import { logger } from "@/lib/logger/logger";
import { recordAuditLog } from "@/lib/db/auditLog";
import { AttendanceRecord } from "../domain/AttendanceRecord";
import { PhotoBlob } from "../domain/PhotoBlob";
import { IndexedDBAttendanceRepository } from "../repository/indexedDBAttendanceRepository";
import { PunchType } from "../store/attendanceStore";

export interface SubmitPunchInput {
  workerIds: string[];
  contractorId: string;
  punchType: PunchType;
  photo: Blob;
  punchedBy: string; // user_id
  punchedAt: string; // ISO8601
}

export interface SubmitPunchResult {
  success: boolean;
  attendanceIds: string[];
}

export async function submitPunchUseCase(input: SubmitPunchInput): Promise<Result<SubmitPunchResult>> {
  logger.info("SUBMIT_PUNCH_ATTEMPT", {
    workerCount: input.workerIds.length,
    punchType: input.punchType,
    punchedBy: input.punchedBy,
  });

  try {
    const repo = new IndexedDBAttendanceRepository();
    const photoObjectId = crypto.randomUUID();
    const createdAt = new Date().toISOString();

    const photoBlob: PhotoBlob = {
      photo_object_id: photoObjectId,
      blob: input.photo,
      content_type: input.photo.type || "image/jpeg",
      byte_size: input.photo.size,
      uploaded_by: input.punchedBy,
      uploaded_at: createdAt,
    };

    const records: AttendanceRecord[] = input.workerIds.map((workerId) => ({
      attendance_id: crypto.randomUUID(),
      worker_id: workerId,
      contractor_id: input.contractorId,
      punch_type: input.punchType,
      clocked_at: input.punchedAt,
      punched_by: input.punchedBy,
      photo_object_id: photoObjectId,
      created_at: createdAt,
    }));

    await repo.savePunch(records, photoBlob);

    // 監査ログに記録 (SYSTEM_REQUIREMENTS audit_log)
    await recordAuditLog({
      actor_user_id: input.punchedBy,
      actor_role: "CONTRACTOR_MANAGER",
      action: "PUNCH",
      detail: {
        worker_ids: input.workerIds,
        punch_type: input.punchType,
        photo_object_id: photoObjectId,
      },
    });

    logger.info("SUBMIT_PUNCH_SUCCESS", {
      attendanceIds: records.map((r) => r.attendance_id),
    });

    return {
      success: true,
      value: {
        success: true,
        attendanceIds: records.map((r) => r.attendance_id),
      },
    };
  } catch (error) {
    logger.error("SUBMIT_PUNCH_SYSTEM_ERROR", { error: String(error) });
    return {
      success: false,
      error: { code: "SYSTEM_ERROR", message: "送信に失敗しました。時間をおいて再度お試しください。" },
    };
  }
}