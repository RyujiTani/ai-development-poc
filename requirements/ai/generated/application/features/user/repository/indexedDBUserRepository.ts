import { initDB } from '@/lib/db';
import { User } from '../domain/types';
import { UserRepository } from './userRepository';

export class IndexedDBUserRepository implements UserRepository {
  async findByLoginId(loginId: string): Promise<User | null> {
    const db = await initDB();
    const tx = db.transaction('users', 'readonly');
    const store = tx.objectStore('users');
    const users = (await store.getAll()) as User[];
    await tx.done;
    
    const foundUser = users.find(user => user.login_id === loginId);
    return foundUser || null;
  }

  async findById(userId: string): Promise<User | null> {
    const db = await initDB();
    const tx = db.transaction('users', 'readonly');
    const store = tx.objectStore('users');
    const users = (await store.getAll()) as User[];
    await tx.done;

    const foundUser = users.find(user => user.user_id === userId);
    return foundUser || null;
  }

  async save(user: User): Promise<void> {
    const db = await initDB();
    const tx = db.transaction('users', 'readwrite');
    await tx.objectStore('users').put(user);
    await tx.done;
  }

  async getAll(): Promise<User[]> {
    const db = await initDB();
    const tx = db.transaction('users', 'readonly');
    const store = tx.objectStore('users');
    const users = (await store.getAll()) as User[];
    await tx.done;
    return users;
  }

  async delete(userId: string): Promise<void> {
    const db = await initDB();
    const tx = db.transaction('users', 'readwrite');
    const store = tx.objectStore('users');
    await store.delete(userId);
    await tx.done;
  }
}