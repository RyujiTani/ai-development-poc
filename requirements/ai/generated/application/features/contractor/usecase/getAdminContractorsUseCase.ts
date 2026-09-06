import { Result } from "@/lib/error/AppError";
import { logger } from "@/lib/logger/logger";
import { Contractor } from "../domain/Contractor";
import { IndexedDBContractorRepository } from "../repository/indexedDBContractorRepository";

export async function getAdminContractorsUseCase(): Promise<Result<Contractor[]>> {
  logger.info("GET_ADMIN_CONTRACTORS_ATTEMPT");
  try {
    const repo = new IndexedDBContractorRepository();
    const contractors = await repo.getAllContractors();
    // 登録日時の降順（最新順）でソート
    contractors.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return {
      success: true,
      value: contractors,
    };
  } catch (error) {
    logger.error("GET_ADMIN_CONTRACTORS_SYSTEM_ERROR", { error: String(error) });
    return {
      success: false,
      error: { code: "SYSTEM_ERROR", message: "外注先企業一覧の取得に失敗しました。" },
    };
  }
}