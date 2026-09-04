import { Result } from '../../../lib/error/appError';
import { logger } from '../../../lib/logger/logger';
import { User } from '../domain/user';
import { UserRepository } from '../repository/userRepository';

export class GetUsersUseCase {
  constructor(private userRepository: UserRepository) {}

  async execute(): Promise<Result<User[]>> {
    try {
      logger.info('get_users_attempt');
      const users = await this.userRepository.findAll();
      
      // 作成日時降順でソート
      users.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      logger.info('get_users_success', { count: users.length });
      return { success: true, value: users };
    } catch (error) {
      logger.error('get_users_failed', error);
      return {
        success: false,
        error: { code: 'SYSTEM_ERROR', message: 'ユーザー一覧の取得に失敗しました。' },
      };
    }
  }
}