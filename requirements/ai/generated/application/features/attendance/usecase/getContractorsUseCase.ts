import { getDB } from "@/lib/db/indexedDB";
import { Result } from "@/lib/error/AppError";
import { logger } from "@/lib/logger/logger";

export interface ContractorDto {
  contractor_id: string;
  name: string;
  status: "ACTIVE" | "INACTIVE";
}

export async function getContractorsUseCase(): Promise<Result<ContractorDto[]>> {
  try {
    const db = await getDB();
    const tx = db.transaction("contractors", "readonly");
    const contractors = await tx.store.getAll();
    await tx.done;

    const activeContractors = (contractors as ContractorDto[]).filter(c => c.status === "ACTIVE");

    return {
      success: true,
      value: activeContractors
    };
  } catch (error) {
    logger.error("GET_CONTRACTORS_SYSTEM_ERROR", { error: String(error) });
    return {
      success: false,
      error: { code: "SYSTEM_ERROR", message: "外注先情報の取得に失敗しました。" }
    };
  }
}