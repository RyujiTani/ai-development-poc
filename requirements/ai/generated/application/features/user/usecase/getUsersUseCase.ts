import { UserRepository } from '../repository/userRepository';
import { User } from '../domain/types';
import { Result, AppError } from '@/lib/core/result';
import { logger } from '@/lib/logger';

export class GetUsersUseCase {
  constructor(private userRepository: UserRepository) {}

  async execute(): Promise<Result<User[], AppError>> {
    try {
      if (!this.userRepository.getAll) {
        return {
          success: false,
          error: new AppError('リポジトリがユーザー一覧取得に対応していません。', 'NOT_IMPLEMENTED'),
        };
      }
      const users = await this.userRepository.getAll();
      return { success: true, value: users };
    } catch (e) {
      logger.error('GET_USERS_ERROR', e);
      return {
        success: false,
        error: new AppError('ユーザー一覧の取得に失敗しました。', 'DATABASE_ERROR'),
      };
    }
  }
}