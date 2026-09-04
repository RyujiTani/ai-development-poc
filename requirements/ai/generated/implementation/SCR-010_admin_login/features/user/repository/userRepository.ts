import { User } from '../domain/user';
import { dbUsers } from '@/lib/db/indexedDb';

export interface UserRepository {
  findByLoginId(loginId: string): Promise<User | null>;
  save(user: User): Promise<void>;
}

export class IndexedDBUserRepository implements UserRepository {
  async findByLoginId(loginId: string): Promise<User | null> {
    return await dbUsers.findByLoginId(loginId);
  }

  async save(user: User): Promise<void> {
    await dbUsers.save(user);
  }
}