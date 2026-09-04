import { UserRepository } from '../repository/userRepository';
import { User } from '../domain/user';

export class GetUserMeUseCase {
  constructor(private userRepository: UserRepository) {}

  async execute(userId: string): Promise<User | null> {
    return this.userRepository.findById(userId);
  }
}