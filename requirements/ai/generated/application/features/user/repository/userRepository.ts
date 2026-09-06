import { User } from "../domain/User";

export interface IUserRepository {
  getAllUsers(): Promise<User[]>;
  getUserById(userId: string): Promise<User | null>;
  saveUser(user: User): Promise<void>;
  deleteUser(userId: string): Promise<void>;
  isLoginIdExists(loginId: string, excludeUserId?: string): Promise<boolean>;
}