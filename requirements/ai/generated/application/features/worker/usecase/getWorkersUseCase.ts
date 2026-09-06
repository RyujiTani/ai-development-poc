import { Result } from "@/lib/error/AppError";
import { logger } from "@/lib/logger/logger";
import { Worker } from "../domain/Worker";
import { IndexedDBWorkerRepository } from "../repository/indexedDBWorkerRepository";

export async function getWorkersUseCase(contractorId: string): Promise<Result<Worker[]>> {
  logger.info("GET_WORKERS_ATTEMPT", { contractorId });
  try {
    const repo = new IndexedDBWorkerRepository();
    const workers = await repo.findByContractorId(contractorId);
    const activeWorkers = workers.filter((w) => w.status === "ACTIVE");
    return {
      success: true,
      value: activeWorkers,
    };
  } catch (error) {
    logger.error("GET_WORKERS_SYSTEM_ERROR", { error: String(error) });
    return {
      success: false,
      error: { code: "SYSTEM_ERROR", message: "作業員情報の取得に失敗しました。" },
    };
  }
}