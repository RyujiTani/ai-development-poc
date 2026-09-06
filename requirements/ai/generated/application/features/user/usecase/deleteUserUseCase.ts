import { UserRepository } from '../repository/userRepository';
import { Result, AppError } from '@/lib/core/result';
import { logger } from '@/lib/logger';
import { initDB } from '@/lib/db';

export class DeleteUserUseCase {
  constructor(private userRepository: UserRepository) {}

  async execute(userId: string, deletedBy: string): Promise<Result<void, AppError>> {
    try {
      if (userId === deletedBy) {
        return {
          success: false,
          error: new AppError('自分自身のアカウントを削除・無効化することはできません。', 'SELF_DELETION_PREVENTED'),
        };
      }

      const existing = await this.userRepository.findById(userId);
      if (!existing) {
        return {
          success: false,
          error: new AppError('指定されたユーザーが見つかりません。', 'NOT_FOUND'),
        };
      }

      const now = new Date().toISOString();
      const updatedUser = {
        ...existing,
        status: 'DISABLED' as const,
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
          actor_user_id: deletedBy,
          actor_role: 'FACTORY_ADMIN',
          action: 'DELETE_USER',
          target_type: 'users',
          target_id: userId,
          detail: {
            login_id: existing.login_id,
          }
        });
        await auditTx.done;
      } catch (auditError) {
        logger.error('DELETE_USER_AUDIT_LOG_ERROR', auditError);
      }

      logger.info('DELETE_USER_SUCCESS', { userId });
      return { success: true, value: undefined };
    } catch (e) {
      logger.error('DELETE_USER_ERROR', e);
      return {
        success: false,
        error: new AppError('ユーザーの削除に失敗しました。', 'DATABASE_ERROR'),
      };
    }
  }
}