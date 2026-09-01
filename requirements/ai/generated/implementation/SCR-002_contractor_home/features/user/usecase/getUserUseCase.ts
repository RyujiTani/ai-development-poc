import { User, Result } from '../domain/user';
import { UserRepository } from '../repository/userRepository';

export class GetUserUseCase {
  constructor(private userRepository: UserRepository) {}

  async execute(userId: string): Promise<Result<User>> {
    if (!userId) {
      return {
        success: false,
        error: { code: 'INVALID_INPUT', message: 'ユーザーIDが必要です。' }
      };
    }
    return this.userRepository.getUserById(userId);
  }
}
"
    },
    {