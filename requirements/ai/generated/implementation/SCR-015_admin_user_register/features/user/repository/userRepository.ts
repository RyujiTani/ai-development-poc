import { User, Contractor } from "../domain/user";
import { initDB } from "@/lib/db/indexedDB";

export interface UserRepository {
  getAllUsers(): Promise<User[]>;
  getActiveContractors(): Promise<Contractor[]>;
  getUserById(userId: string): Promise<User | null>;
  getUserByLoginId(loginId: string): Promise<User | null>;
  createUser(user: User): Promise<void>;
  updateUser(user: User): Promise<void>;
  deleteUser(userId: string): Promise<void>;
}

export class IndexedDBUserRepository implements UserRepository {
  async getAllUsers(): Promise<User[]> {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction("users", "readonly");
      const store = transaction.objectStore("users");
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result || []);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getActiveContractors(): Promise<Contractor[]> {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction("contractors", "readonly");
      const store = transaction.objectStore("contractors");
      const request = store.getAll();

      request.onsuccess = () => {
        const contractors: Contractor[] = request.result || [];
        resolve(contractors.filter(c => c.status === "ACTIVE"));
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getUserById(userId: string): Promise<User | null> {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction("users", "readonly");
      const store = transaction.objectStore("users");
      const request = store.get(userId);

      request.onsuccess = () => {
        resolve(request.result || null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getUserByLoginId(loginId: string): Promise<User | null> {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction("users", "readonly");
      const store = transaction.objectStore("users");
      const index = store.index("login_id");
      const request = index.get(loginId);

      request.onsuccess = () => {
        resolve(request.result || null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async createUser(user: User): Promise<void> {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction("users", "readwrite");
      const store = transaction.objectStore("users");
      const request = store.add(user);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async updateUser(user: User): Promise<void> {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction("users", "readwrite");
      const store = transaction.objectStore("users");
      const request = store.put(user);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async deleteUser(userId: string): Promise<void> {
    const db = await initDB();
    const user = await this.getUserById(userId);
    if (!user) {
      throw new Error("User not found");
    }
    user.status = "DISABLED";
    user.updated_at = new Date().toISOString();
    await this.updateUser(user);
  }
}
"
    },
    {