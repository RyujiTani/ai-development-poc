import { User } from '../domain/user';
import { openDB } from '../../../lib/db/indexedDB';

export interface UserRepository {
  findByLoginId(loginId: string): Promise<User | null>;
  save(user: User): Promise<void>;
  findAll(): Promise<User[]>;
  delete(userId: string): Promise<void>;
}

export class IndexedDBUserRepository implements UserRepository {
  async findByLoginId(loginId: string): Promise<User | null> {
    const db = await openDB();
    const tx = db.transaction('users', 'readonly');
    const store = tx.objectStore('users');

    return new Promise((resolve, reject) => {
      const request = store.openCursor();
      let foundUser: User | null = null;

      request.onsuccess = () => {
        const cursor = request.result;
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

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  async save(user: User): Promise<void> {
    const db = await openDB();
    const tx = db.transaction('users', 'readwrite');
    const store = tx.objectStore('users');

    return new Promise((resolve, reject) => {
      const request = store.put(user);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async findAll(): Promise<User[]> {
    const db = await openDB();
    const tx = db.transaction('users', 'readonly');
    const store = tx.objectStore('users');

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        resolve(request.result || []);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async delete(userId: string): Promise<void> {
    const db = await openDB();
    const tx = db.transaction('users', 'readwrite');
    const store = tx.objectStore('users');

    return new Promise((resolve, reject) => {
      const request = store.delete(userId);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}