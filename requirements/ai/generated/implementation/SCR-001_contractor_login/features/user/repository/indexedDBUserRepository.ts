import { UserRepository } from './userRepository';
import { User } from '../domain/user';
import { initDB } from '@/lib/db/indexedDB';

export class IndexedDBUserRepository implements UserRepository {
  async findByLoginId(loginId: string): Promise<User | null> {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['users'], 'readonly');
      const store = transaction.objectStore('users');
      const request = store.getAll();

      request.onsuccess = () => {
        const users = request.result as User[];
        const user = users.find((u) => u.login_id === loginId);
        resolve(user || null);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  async updateLastLogin(userId: string): Promise<void> {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['users'], 'readwrite');
      const store = transaction.objectStore('users');
      const getRequest = store.get(userId);

      getRequest.onsuccess = () => {
        const user = getRequest.result as User;
        if (user) {
          user.last_login_at = new Date().toISOString();
          user.updated_at = new Date().toISOString();
          const putRequest = store.put(user);
          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () => reject(putRequest.error);
        } else {
          resolve();
        }
      };

      getRequest.onerror = () => {
        reject(getRequest.error);
      };
    });
  }
}