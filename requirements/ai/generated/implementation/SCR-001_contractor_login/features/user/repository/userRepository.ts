import { User, AuditLog } from '../domain/user';
import { initDB } from '@/lib/db/indexedDB';

export interface UserRepository {
  findByLoginId(loginId: string): Promise<User | null>;
  saveAuditLog(log: AuditLog): Promise<void>;
}

export class IndexedDBUserRepository implements UserRepository {
  async findByLoginId(loginId: string): Promise<User | null> {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('users', 'readonly');
      const store = tx.objectStore('users');
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

  async saveAuditLog(log: AuditLog): Promise<void> {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('audit_logs', 'readwrite');
      const store = tx.objectStore('audit_logs');
      const request = store.add(log);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }
}