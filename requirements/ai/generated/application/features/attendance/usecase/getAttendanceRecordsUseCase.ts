import { Result } from "@/lib/error/AppError";
import { logger } from "@/lib/logger/logger";
import { AttendanceRecord } from "../domain/AttendanceRecord";
import { IndexedDBAttendanceRepository } from "../repository/indexedDBAttendanceRepository";

export async function getAttendanceRecordsUseCase(
  contractorId: string
): Promise<Result<AttendanceRecord[]>> {
  logger.info("GET_ATTENDANCE_RECORDS_ATTEMPT", { contractorId });
  try {
    const repo = new IndexedDBAttendanceRepository();
    const records = await repo.getRecordsByContractorId(contractorId);
    return {
      success: true,
      value: records,
    };
  } catch (error) {
    logger.error("GET_ATTENDANCE_RECORDS_SYSTEM_ERROR", { error: String(error) });
    return {
      success: false,
      error: { code: "SYSTEM_ERROR", message: "打刻履歴の取得に失敗しました。" },
    };
  }
}