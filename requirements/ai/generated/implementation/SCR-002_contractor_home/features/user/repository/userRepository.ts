import { User } from '../domain/user';
import { initDB } from '../../../lib/db/indexedDb';

export interface UserRepository {
  findById(userId: string): Promise<User | null>;
}

export class IndexedDBUserRepository implements UserRepository {
  async findById(userId: string): Promise<User | null> {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('users', 'readonly');
      const store = transaction.objectStore('users');
      const request = store.get(userId);

      request.onsuccess = () => {
        resolve(request.result || null);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }
}