import { Result } from "@/lib/error/AppError";
import { logger } from "@/lib/logger/logger";
import { recordAuditLog } from "@/lib/db/auditLog";
import { hashPassword } from "@/lib/auth/hash";
import { User } from "../domain/User";
import { IndexedDBUserRepository } from "../repository/indexedDBUserRepository";

export interface SaveAdminUserInput {
  userId?: string; // 新規の場合は undefined
  contractorId: string | null;
  role: 'FACTORY_ADMIN' | 'CONTRACTOR_MANAGER';
  loginId: string;
  passwordPlain?: string; // 編集時は省略可能（変更しない場合）
  displayName: string;
  status: 'ACTIVE' | 'LOCKED' | 'DISABLED';
  actorUserId: string;
}

export async function saveAdminUserUseCase(input: SaveAdminUserInput): Promise<Result<User>> {
  const isEdit = !!input.userId;
  logger.info(isEdit ? "UPDATE_USER_ATTEMPT" : "CREATE_USER_ATTEMPT", {
    userId: input.userId,
    loginId: input.loginId,
  });

  try {
    const repo = new IndexedDBUserRepository();

    // ログインID（ユーザーID）の重複チェック (SCR-015-VL-001)
    const isExists = await repo.isLoginIdExists(input.loginId, input.userId);
    if (isExists) {
      logger.warn("SAVE_USER_FAILED_LOGIN_ID_DUPLICATE", { loginId: input.loginId });
      return {
        success: false,
        error: { code: "LOGIN_ID_DUPLICATE", message: "このユーザーID（ログインID）は既に登録されています。" },
      };
    }

    const now = new Date().toISOString();
    let existingUser: User | null = null;
    if (isEdit && input.userId) {
      existingUser = await repo.getUserById(input.userId);
      if (!existingUser) {
        return {
          success: false,
          error: { code: "USER_NOT_FOUND", message: "指定されたユーザーが見つかりません。" },
        };
      }
    }

    // 新規登録時のパスワード必須チェック (SCR-015-VL-002)
    if (!isEdit && !input.passwordPlain) {
      return {
        success: false,
        error: { code: "PASSWORD_REQUIRED", message: "新規登録時はパスワードが必須です。" },
      };
    }

    const targetUserId = input.userId || crypto.randomUUID();
    const createdAt = existingUser ? existingUser.created_at : now;

    let passwordHash = existingUser ? existingUser.password_hash : "";
    if (input.passwordPlain) {
      passwordHash = hashPassword(input.passwordPlain);
    }

    const user: User = {
      user_id: targetUserId,
      contractor_id: input.contractorId,
      role: input.role,
      login_id: input.loginId,
      password_hash: passwordHash,
      display_name: input.displayName,
      status: input.status,
      created_at: createdAt,
      updated_at: now,
    };

    await repo.saveUser(user);

    // 監査ログに記録
    await recordAuditLog({
      actor_user_id: input.actorUserId,
      actor_role: "FACTORY_ADMIN",
      action: isEdit ? "UPDATE_USER" : "CREATE_USER",
      target_type: "user",
      target_id: targetUserId,
      detail: {
        login_id: input.loginId,
        role: input.role,
        display_name: input.displayName,
        status: input.status,
      },
    });

    logger.info(isEdit ? "UPDATE_USER_SUCCESS" : "CREATE_USER_SUCCESS", { userId: targetUserId });

    return {
      success: true,
      value: user,
    };
  } catch (error) {
    logger.error("SAVE_USER_SYSTEM_ERROR", { error: String(error) });
    return {
      success: false,
      error: { code: "SYSTEM_ERROR", message: "ユーザー情報の保存に失敗しました。" },
    };
  }
}