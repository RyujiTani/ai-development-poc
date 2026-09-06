import { User } from '../domain/types';

export interface UserRepository {
  findByLoginId(loginId: string): Promise<User | null>;
  findById(userId: string): Promise<User | null>;
  save(user: User): Promise<void>;
  getAll?(): Promise<User[]>;
  delete?(userId: string): Promise<void>;
}