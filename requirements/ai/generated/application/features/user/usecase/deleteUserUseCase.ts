import { Result } from '../../../lib/error/appError';
import { logger } from '../../../lib/logger/logger';
import { UserRepository } from '../repository/userRepository';

export class DeleteUserUseCase {
  constructor(private userRepository: UserRepository) {}

  async execute(userId: string, currentUser_id?: string): Promise<Result<void>> {
    try {
      logger.info('delete_user_attempt', { user_id: userId });

      // 自分自身の削除ロックアウト防止
      if (currentUser_id && userId === currentUser_id) {
        return {
          success: false,
          error: { code: 'FORBIDDEN', message: '現在ログイン中の自分自身のアカウントを削除することはできません。' },
        };
      }

      const users = await this.userRepository.findAll();
      const existing = users.find(u => u.user_id === userId);
      if (!existing) {
        logger.warn('delete_user_not_found', { user_id: userId });
        return {
          success: false,
          error: { code: 'NOT_FOUND', message: 'ユーザーが見つかりません。' },
        };
      }

      await this.userRepository.delete(userId);
      logger.info('delete_user_success', { user_id: userId });
      return { success: true, value: undefined };
    } catch (error) {
      logger.error('delete_user_failed', error, { user_id: userId });
      return {
        success: false,
        error: { code: 'SYSTEM_ERROR', message: 'ユーザーの削除に失敗しました。' },
      };
    }
  }
}