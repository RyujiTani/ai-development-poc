import { User } from '../domain/user';

export interface UserRepository {
  findByLoginId(loginId: string): Promise<User | null>;
  updateLastLogin(userId: string): Promise<void>;
}