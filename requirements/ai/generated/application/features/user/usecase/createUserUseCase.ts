import { UserRepository } from '../repository/userRepository';
import { User, Role } from '../domain/types';
import { Result, AppError } from '@/lib/core/result';
import { logger } from '@/lib/logger';
import { initDB } from '@/lib/db';

export interface CreateUserInput {
  loginId: string;
  passwordHash: string;
  role: Role;
  displayName: string;
  contractorId: string | null;
  createdBy: string;
}

export class CreateUserUseCase {
  constructor(private userRepository: UserRepository) {}

  async execute(input: CreateUserInput): Promise<Result<User, AppError>> {
    try {
      if (!input.loginId || !input.loginId.trim()) {
        return {
          success: false,
          error: new AppError('ユーザーIDは必須入力です。', 'VALIDATION_ERROR'),
        };
      }
      if (!input.displayName || !input.displayName.trim()) {
        return {
          success: false,
          error: new AppError('表示名は必須入力です。', 'VALIDATION_ERROR'),
        };
      }
      if (!input.passwordHash || !input.passwordHash.trim()) {
        return {
          success: false,
          error: new AppError('パスワードは必須入力です。', 'VALIDATION_ERROR'),
        };
      }
      if (input.passwordHash.length < 8) {
        return {
          success: false,
          error: new AppError('パスワードは8文字以上である必要があります。', 'VALIDATION_ERROR'),
        };
      }
      if (input.role === 'CONTRACTOR_MANAGER' && !input.contractorId) {
        return {
          success: false,
          error: new AppError('外注先管理者の場合、所属外注先企業は必須です。', 'VALIDATION_ERROR'),
        };
      }

      // 重複チェック
      const existing = await this.userRepository.findByLoginId(input.loginId.trim());
      if (existing) {
        return {
          success: false,
          error: new AppError('ユーザーIDが重複しています。', 'DUPLICATE_LOGIN_ID'),
        };
      }

      const userId = `usr-${crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2)}`;
      const now = new Date().toISOString();
      const newUser: User = {
        user_id: userId,
        contractor_id: input.role === 'FACTORY_ADMIN' ? null : input.contractorId,
        role: input.role,
        login_id: input.loginId.trim(),
        password_hash: input.passwordHash,
        display_name: input.displayName.trim(),
        status: 'ACTIVE',
        created_at: now,
        updated_at: now,
      };

      await this.userRepository.save(newUser);

      // 監査ログ書き込み
      try {
        const db = await initDB();
        const auditTx = db.transaction('audit_logs', 'readwrite');
        const auditStore = auditTx.objectStore('audit_logs');
        const auditId = `aud-${crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2)}`;
        await auditStore.put({
          audit_id: auditId,
          occurred_at: now,
          actor_user_id: input.createdBy,
          actor_role: 'FACTORY_ADMIN',
          action: 'CREATE_USER',
          target_type: 'users',
          target_id: userId,
          detail: {
            login_id: newUser.login_id,
            role: newUser.role,
            display_name: newUser.display_name,
          }
        });
        await auditTx.done;
      } catch (auditError) {
        logger.error('CREATE_USER_AUDIT_LOG_ERROR', auditError);
      }

      logger.info('CREATE_USER_SUCCESS', { userId });
      return { success: true, value: newUser };
    } catch (e) {
      logger.error('CREATE_USER_ERROR', e);
      return {
        success: false,
        error: new AppError('ユーザーの登録に失敗しました。', 'DATABASE_ERROR'),
      };
    }
  }
}