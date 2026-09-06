import { Result } from "@/lib/error/AppError";
import { logger } from "@/lib/logger/logger";
import { recordAuditLog } from "@/lib/db/auditLog";
import { IndexedDBUserRepository } from "../repository/indexedDBUserRepository";

export async function deleteAdminUserUseCase(
  targetUserId: string,
  actorUserId: string
): Promise<Result<{ success: boolean }>> {
  logger.info("DELETE_USER_ATTEMPT", { targetUserId, actorUserId });

  // 自分自身のアカウント削除を防ぐガード処理 (AMB-015-003, 安全性のための自己削除防止)
  if (targetUserId === actorUserId) {
    logger.warn("DELETE_USER_PREVENTED_SELF_DELETION", { targetUserId });
    return {
      success: false,
      error: { code: "SELF_DELETION_PREVENTED", message: "ログイン中の自分自身のアカウントを削除することはできません。" },
    };
  }

  try {
    const repo = new IndexedDBUserRepository();
    await repo.deleteUser(targetUserId);

    // 監査ログに記録
    await recordAuditLog({
      actor_user_id: actorUserId,
      actor_role: "FACTORY_ADMIN",
      action: "DELETE_USER",
      target_type: "user",
      target_id: targetUserId,
    });

    logger.info("DELETE_USER_SUCCESS", { targetUserId });
    return {
      success: true,
      value: { success: true },
    };
  } catch (error) {
    logger.error("DELETE_USER_SYSTEM_ERROR", { error: String(error) });
    return {
      success: false,
      error: { code: "SYSTEM_ERROR", message: "ユーザーの削除に失敗しました。" },
    };
  }
}