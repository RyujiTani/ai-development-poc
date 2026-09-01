import { User } from '../domain/types';
import { initDB } from '@/lib/db/indexedDb';

export interface UserRepository {
  findByLoginId(loginId: string): Promise<User | null>;
  save(user: User): Promise<void>;
}

export class IndexedDBUserRepository implements UserRepository {
  async findByLoginId(loginId: string): Promise<User | null> {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('users', 'readonly');
      const store = transaction.objectStore('users');
      const request = store.getAll();

      request.onsuccess = () => {
        const users = request.result as User[];
        const user = users.find(u => u.login_id === loginId);
        resolve(user || null);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  async save(user: User): Promise<void> {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('users', 'readwrite');
      const store = transaction.objectStore('users');
      const request = store.put(user);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}
"
    },
    {