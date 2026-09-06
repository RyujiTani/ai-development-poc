import { getDB } from "@/lib/db/indexedDB";
import { User } from "../domain/User";
import { IUserRepository } from "./userRepository";

export class IndexedDBUserRepository implements IUserRepository {
  async getAllUsers(): Promise<User[]> {
    const db = await getDB();
    const tx = db.transaction("users", "readonly");
    const users = await tx.store.getAll();
    await tx.done;
    return users as User[];
  }

  async getUserById(userId: string): Promise<User | null> {
    const db = await getDB();
    const tx = db.transaction("users", "readonly");
    const user = await tx.store.get(userId);
    await tx.done;
    return (user as User) || null;
  }

  async saveUser(user: User): Promise<void> {
    const db = await getDB();
    const tx = db.transaction("users", "readwrite");
    await tx.store.put(user);
    await tx.done;
  }

  async deleteUser(userId: string): Promise<void> {
    const db = await getDB();
    const tx = db.transaction("users", "readwrite");
    await tx.store.delete(userId);
    await tx.done;
  }

  async isLoginIdExists(loginId: string, excludeUserId?: string): Promise<boolean> {
    const db = await getDB();
    const tx = db.transaction("users", "readonly");
    const index = tx.store.index("by-login-id");
    const user = await index.get(loginId);
    await tx.done;
    
    if (!user) return false;
    if (excludeUserId && user.user_id === excludeUserId) return false;
    return true;
  }
}