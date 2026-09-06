import { getDB } from "@/lib/db/indexedDB";
import { Result } from "@/lib/error/AppError";
import { logger } from "@/lib/logger/logger";

export interface UserMeResult {
  userId: string;
  contractorId: string;
  role: "CONTRACTOR_MANAGER";
  displayName: string;
  status: "ACTIVE";
}

export async function getUserMeUseCase(userId: string): Promise<Result<UserMeResult>> {
  logger.info("GET_USER_ME_ATTEMPT", { userId });
  try {
    const db = await getDB();
    const tx = db.transaction("users", "readonly");
    const user = await tx.store.get(userId);
    await tx.done;

    if (!user) {
      logger.warn("GET_USER_ME_FAILED_NOT_FOUND", { userId });
      return {
        success: false,
        error: { code: "USER_NOT_FOUND", message: "ユーザー情報が見つかりません" },
      };
    }

    if (user.role !== "CONTRACTOR_MANAGER") {
      logger.warn("GET_USER_ME_FAILED_INVALID_ROLE", { userId, role: user.role });
      return {
        success: false,
        error: { code: "INVALID_ROLE", message: "権限がありません" },
      };
    }

    return {
      success: true,
      value: {
        userId: user.user_id,
        contractorId: user.contractor_id || "",
        role: user.role,
        displayName: user.display_name,
        status: user.status as "ACTIVE",
      },
    };
  } catch (error) {
    logger.error("GET_USER_ME_SYSTEM_ERROR", { error: String(error) });
    return {
      success: false,
      error: { code: "SYSTEM_ERROR", message: "システムエラーが発生しました。" },
    };
  }
}