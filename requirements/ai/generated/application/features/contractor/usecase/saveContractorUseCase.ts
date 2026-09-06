import { Result } from "@/lib/error/AppError";
import { logger } from "@/lib/logger/logger";
import { recordAuditLog } from "@/lib/db/auditLog";
import { Contractor } from "../domain/Contractor";
import { IndexedDBContractorRepository } from "../repository/indexedDBContractorRepository";

export interface SaveContractorInput {
  contractorId?: string; // 新規は undefined
  name: string;
  status: "ACTIVE" | "INACTIVE";
  userId: string;
}

export async function saveContractorUseCase(input: SaveContractorInput): Promise<Result<Contractor>> {
  const isEdit = !!input.contractorId;
  logger.info(isEdit ? "UPDATE_CONTRACTOR_ATTEMPT" : "CREATE_CONTRACTOR_ATTEMPT", {
    contractorId: input.contractorId,
    name: input.name,
  });

  try {
    const repo = new IndexedDBContractorRepository();
    const now = new Date().toISOString();

    let existingContractor: Contractor | null = null;
    if (isEdit && input.contractorId) {
      existingContractor = await repo.getContractorById(input.contractorId);
    }

    const contractorId = input.contractorId || crypto.randomUUID();
    const createdAt = existingContractor ? existingContractor.created_at : now;

    const contractor: Contractor = {
      contractor_id: contractorId,
      name: input.name,
      status: input.status,
      created_at: createdAt,
      updated_at: now,
    };

    await repo.saveContractor(contractor);

    // 監査ログに記録
    await recordAuditLog({
      actor_user_id: input.userId,
      actor_role: "FACTORY_ADMIN",
      action: isEdit ? "UPDATE_CONTRACTOR" : "CREATE_CONTRACTOR",
      target_type: "contractor",
      target_id: contractorId,
      detail: {
        name: input.name,
        status: input.status,
      },
    });

    logger.info(isEdit ? "UPDATE_CONTRACTOR_SUCCESS" : "CREATE_CONTRACTOR_SUCCESS", { contractorId });

    return {
      success: true,
      value: contractor,
    };
  } catch (error) {
    logger.error("SAVE_CONTRACTOR_SYSTEM_ERROR", { error: String(error) });
    return {
      success: false,
      error: { code: "SYSTEM_ERROR", message: "外注先企業の保存に失敗しました。" },
    };
  }
}