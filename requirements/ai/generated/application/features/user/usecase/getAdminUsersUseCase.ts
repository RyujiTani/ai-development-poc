import { Result } from "@/lib/error/AppError";
import { logger } from "@/lib/logger/logger";
import { User } from "../domain/User";
import { IndexedDBUserRepository } from "../repository/indexedDBUserRepository";

export async function getAdminUsersUseCase(): Promise<Result<User[]>> {
  logger.info("GET_ADMIN_USERS_ATTEMPT");
  try {
    const repo = new IndexedDBUserRepository();
    const users = await repo.getAllUsers();
    // 登録日時の降順（最新順）でソート
    users.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return {
      success: true,
      value: users,
    };
  } catch (error) {
    logger.error("GET_ADMIN_USERS_SYSTEM_ERROR", { error: String(error) });
    return {
      success: false,
      error: { code: "SYSTEM_ERROR", message: "ユーザー一覧の取得に失敗しました。" },
    };
  }
}