import { Result } from "@/lib/error/AppError";
import { logger } from "@/lib/logger/logger";
import { IndexedDBWorkerRepository } from "../repository/indexedDBWorkerRepository";
import { recordAuditLog } from "@/lib/db/auditLog";

export async function deleteWorkerUseCase(workerId: string, deletedByUserId: string): Promise<Result<{ success: boolean }>> {
  logger.info("DELETE_WORKER_ATTEMPT", { workerId, deletedByUserId });
  try {
    const repo = new IndexedDBWorkerRepository();
    await repo.deleteWorker(workerId);

    // 監査ログに記録 (SYSTEM_REQUIREMENTS audit_log)
    await recordAuditLog({
      actor_user_id: deletedByUserId,
      actor_role: "CONTRACTOR_MANAGER",
      action: "DELETE_WORKER",
      target_type: "worker",
      target_id: workerId,
    });

    logger.info("DELETE_WORKER_SUCCESS", { workerId });
    return {
      success: true,
      value: { success: true },
    };
  } catch (error) {
    logger.error("DELETE_WORKER_SYSTEM_ERROR", { error: String(error) });
    return {
      success: false,
      error: { code: "SYSTEM_ERROR", message: "作業員の削除に失敗しました。" },
    };
  }
}