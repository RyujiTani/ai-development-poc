import { User } from '../domain/user';
import { initDB } from '@/lib/db/idb';

export interface UserRepository {
  getUsers(): Promise<User[]>;
  createUser(user: User): Promise<void>;
  updateUser(user: User): Promise<void>;
  deleteUser(userId: string): Promise<void>;
  userExists(loginId: string): Promise<boolean>;
}

export class IndexedDBUserRepository implements UserRepository {
  async getUsers(): Promise<User[]> {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('users', 'readonly');
      const store = tx.objectStore('users');
      const req = store.getAll();
      req.onsuccess = () => {
        resolve(req.result as User[]);
      };
      req.onerror = () => reject(req.error);
    });
  }

  async createUser(user: User): Promise<void> {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('users', 'readwrite');
      const store = tx.objectStore('users');
      const req = store.add(user);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async updateUser(user: User): Promise<void> {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('users', 'readwrite');
      const store = tx.objectStore('users');
      const req = store.put(user);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async deleteUser(userId: string): Promise<void> {
    const db = await initDB();
    const user = await this.getUserById(userId);
    if (!user) return;
    
    user.status = 'DISABLED';
    user.updated_at = new Date().toISOString();
    await this.updateUser(user);
  }

  private async getUserById(userId: string): Promise<User | null> {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('users', 'readonly');
      const store = tx.objectStore('users');
      const req = store.get(userId);
      req.onsuccess = () => resolve((req.result as User) || null);
      req.onerror = () => reject(req.error);
    });
  }

  async userExists(loginId: string): Promise<boolean> {
    const users = await this.getUsers();
    return users.some(u => u.login_id === loginId);
  }
}

let userRepositoryInstance: UserRepository | null = null;

export function getUserRepository(): UserRepository {
  if (!userRepositoryInstance) {
    userRepositoryInstance = new IndexedDBUserRepository();
  }
  return userRepositoryInstance;
}

export function setUserRepository(repo: UserRepository | null) {
  userRepositoryInstance = repo;
}