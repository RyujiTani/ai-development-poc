import { Result } from "@/lib/error/AppError";
import { logger } from "@/lib/logger/logger";
import { recordAuditLog } from "@/lib/db/auditLog";
import { IndexedDBContractorRepository } from "../repository/indexedDBContractorRepository";

export async function deleteContractorUseCase(
  contractorId: string,
  userId: string
): Promise<Result<{ success: boolean }>> {
  logger.info("DELETE_CONTRACTOR_ATTEMPT", { contractorId, userId });
  try {
    const repo = new IndexedDBContractorRepository();

    // 削除制限: 紐づく作業員が存在する場合は削除不可 (AMB-014-002 / TS-014-007)
    const hasWorkers = await repo.hasWorkers(contractorId);
    if (hasWorkers) {
      logger.warn("DELETE_CONTRACTOR_RESTRICTED_HAS_WORKERS", { contractorId });
      return {
        success: false,
        error: {
          code: "HAS_ASSOCIATED_WORKERS",
          message: "紐づく作業員が存在するため削除できません",
        },
      };
    }

    await repo.deleteContractor(contractorId);

    // 監査ログに記録
    await recordAuditLog({
      actor_user_id: userId,
      actor_role: "FACTORY_ADMIN",
      action: "DELETE_CONTRACTOR",
      target_type: "contractor",
      target_id: contractorId,
    });

    logger.info("DELETE_CONTRACTOR_SUCCESS", { contractorId });
    return {
      success: true,
      value: { success: true },
    };
  } catch (error) {
    logger.error("DELETE_CONTRACTOR_SYSTEM_ERROR", { error: String(error) });
    return {
      success: false,
      error: { code: "SYSTEM_ERROR", message: "外注先企業の削除に失敗しました。" },
    };
  }
}