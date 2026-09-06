import { Result } from "@/lib/error/AppError";
import { logger } from "@/lib/logger/logger";
import { Worker } from "../domain/Worker";
import { IndexedDBWorkerRepository } from "../repository/indexedDBWorkerRepository";

export async function getWorkerByIdUseCase(workerId: string): Promise<Result<Worker>> {
  logger.info("GET_WORKER_BY_ID_ATTEMPT", { workerId });
  try {
    const repo = new IndexedDBWorkerRepository();
    const worker = await repo.getWorkerById(workerId);
    if (!worker) {
      logger.warn("GET_WORKER_BY_ID_FAILED_NOT_FOUND", { workerId });
      return {
        success: false,
        error: { code: "WORKER_NOT_FOUND", message: "作業員情報が見つかりません" },
      };
    }
    return {
      success: true,
      value: worker,
    };
  } catch (error) {
    logger.error("GET_WORKER_BY_ID_SYSTEM_ERROR", { error: String(error) });
    return {
      success: false,
      error: { code: "SYSTEM_ERROR", message: "作業員の取得に失敗しました。" },
    };
  }
}