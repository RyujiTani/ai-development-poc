import { User } from "../domain/user";
import { initDB } from "@/lib/db/indexedDB";

export interface UserRepository {
  findByLoginId(loginId: string): Promise<User | null>;
  updateLastLogin(userId: string): Promise<void>;
}

export class IndexedDBUserRepository implements UserRepository {
  async findByLoginId(loginId: string): Promise<User | null> {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction("users", "readonly");
      const store = transaction.objectStore("users");
      const index = store.index("login_id");
      const request = index.get(loginId);

      request.onsuccess = () => {
        resolve(request.result || null);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  async updateLastLogin(userId: string): Promise<void> {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction("users", "readwrite");
      const store = transaction.objectStore("users");
      const getRequest = store.get(userId);

      getRequest.onsuccess = () => {
        const user = getRequest.result as User | undefined;
        if (user) {
          user.last_login_at = new Date().toISOString();
          user.updated_at = new Date().toISOString();
          const updateRequest = store.put(user);
          updateRequest.onsuccess = () => resolve();
          updateRequest.onerror = () => reject(updateRequest.error);
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
"}, {