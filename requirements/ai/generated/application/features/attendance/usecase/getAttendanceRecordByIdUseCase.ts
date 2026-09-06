import { Result } from "@/lib/error/AppError";
import { logger } from "@/lib/logger/logger";
import { AttendanceRecord } from "../domain/AttendanceRecord";
import { IndexedDBAttendanceRepository } from "../repository/indexedDBAttendanceRepository";

export async function getAttendanceRecordByIdUseCase(
  attendanceId: string
): Promise<Result<AttendanceRecord>> {
  logger.info("GET_ATTENDANCE_RECORD_BY_ID_ATTEMPT", { attendanceId });
  try {
    const repo = new IndexedDBAttendanceRepository();
    const record = await repo.getRecordById(attendanceId);
    if (!record) {
      logger.warn("GET_ATTENDANCE_RECORD_BY_ID_NOT_FOUND", { attendanceId });
      return {
        success: false,
        error: { code: "RECORD_NOT_FOUND", message: "打刻実績が見つかりません" },
      };
    }
    return {
      success: true,
      value: record,
    };
  } catch (error) {
    logger.error("GET_ATTENDANCE_RECORD_BY_ID_SYSTEM_ERROR", { error: String(error) });
    return {
      success: false,
      error: { code: "SYSTEM_ERROR", message: "データの取得に失敗しました。" },
    };
  }
}