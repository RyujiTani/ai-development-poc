import { User } from '../domain/user';
import { openDB } from '@/lib/db/idb';

export interface UserRepository {
  findByLoginId(loginId: string): Promise<User | null>;
}

export class IndexedDBUserRepository implements UserRepository {
  async findByLoginId(loginId: string): Promise<User | null> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['users'], 'readonly');
      const store = transaction.objectStore('users');
      const request = store.openCursor();
      let foundUser: User | null = null;

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue | null>).result;
        if (cursor) {
          const user = cursor.value as User;
          if (user.login_id === loginId) {
            foundUser = user;
            resolve(foundUser);
            return;
          }
          cursor.continue();
        } else {
          resolve(null);
        }
      };

      request.onerror = () => reject(request.error);
    });
  }
}