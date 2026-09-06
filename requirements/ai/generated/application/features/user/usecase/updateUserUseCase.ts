import { UserRepository } from '../repository/userRepository';
import { User, Role } from '../domain/types';
import { Result, AppError } from '@/lib/core/result';
import { logger } from '@/lib/logger';
import { initDB } from '@/lib/db';

export interface UpdateUserInput {
  userId: string;
  role: Role;
  displayName: string;
  contractorId: string | null;
  passwordHash?: string;
  updatedBy: string;
}

export class UpdateUserUseCase {
  constructor(private userRepository: UserRepository) {}

  async execute(input: UpdateUserInput): Promise<Result<User, AppError>> {
    try {
      const existing = await this.userRepository.findById(input.userId);
      if (!existing) {
        return {
          success: false,
          error: new AppError('指定されたユーザーが見つかりません。', 'NOT_FOUND'),
        };
      }

      if (!input.displayName || !input.displayName.trim()) {
        return {
          success: false,
          error: new AppError('表示名は必須入力です。', 'VALIDATION_ERROR'),
        };
      }

      if (input.role === 'CONTRACTOR_MANAGER' && !input.contractorId) {
        return {
          success: false,
          error: new AppError('外注先管理者の場合、所属外注先企業は必須です。', 'VALIDATION_ERROR'),
        };
      }

      if (input.passwordHash && input.passwordHash.trim() !== '' && input.passwordHash.length < 8) {
        return {
          success: false,
          error: new AppError('パスワードは8文字以上である必要があります。', 'VALIDATION_ERROR'),
        };
      }

      const now = new Date().toISOString();
      const updatedUser: User = {
        ...existing,
        role: input.role,
        display_name: input.displayName.trim(),
        contractor_id: input.role === 'FACTORY_ADMIN' ? null : input.contractorId,
        password_hash: input.passwordHash && input.passwordHash.trim() !== '' ? input.passwordHash : existing.password_hash,
        updated_at: now,
      };

      await this.userRepository.save(updatedUser);

      // 監査ログ書き込み
      try {
        const db = await initDB();
        const auditTx = db.transaction('audit_logs', 'readwrite');
        const auditStore = auditTx.objectStore('audit_logs');
        const auditId = `aud-${crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2)}`;
        await auditStore.put({
          audit_id: auditId,
          occurred_at: now,
          actor_user_id: input.updatedBy,
          actor_role: 'FACTORY_ADMIN',
          action: 'UPDATE_USER',
          target_type: 'users',
          target_id: input.userId,
          detail: {
            role: updatedUser.role,
            display_name: updatedUser.display_name,
          }
        });
        await auditTx.done;
      } catch (auditError) {
        logger.error('UPDATE_USER_AUDIT_LOG_ERROR', auditError);
      }

      logger.info('UPDATE_USER_SUCCESS', { userId: input.userId });
      return { success: true, value: updatedUser };
    } catch (e) {
      logger.error('UPDATE_USER_ERROR', e);
      return {
        success: false,
        error: new AppError('ユーザー情報の更新に失敗しました。', 'DATABASE_ERROR'),
      };
    }
  }
}