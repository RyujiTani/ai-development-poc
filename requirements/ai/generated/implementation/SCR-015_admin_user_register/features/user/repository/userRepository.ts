import { User } from '../domain/user';
import { getDB } from '@/lib/db/indexedDb';

export interface UserRepository {
  getAllUsers(): Promise<User[]>;
  getUserById(userId: string): Promise<User | null>;
  getUserByLoginId(loginId: string): Promise<User | null>;
  createUser(user: User): Promise<User>;
  updateUser(user: User): Promise<User>;
  deleteUser(userId: string): Promise<void>;
}

// Node環境 or テスト環境での自動フェイルセーフ用メモリ
let memoryUsers: User[] = [
  {
    user_id: 'admin-1',
    contractor_id: null,
    role: 'FACTORY_ADMIN',
    login_id: 'admin-1',
    password_hash: 'hashed_password123',
    display_name: '工場管理者 鈴木',
    status: 'ACTIVE',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    user_id: 'contractor-admin-1',
    contractor_id: 'contractor-1',
    role: 'CONTRACTOR_MANAGER',
    login_id: 'con-1',
    password_hash: 'hashed_password123',
    display_name: '外注先担当 田中',
    status: 'ACTIVE',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export class IndexedDBUserRepository implements UserRepository {
  async getAllUsers(): Promise<User[]> {
    if (typeof window === 'undefined') return memoryUsers;
    try {
      const db = await getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('users', 'readonly');
        const store = tx.objectStore('users');
        const req = store.getAll();
        req.onsuccess = () => {
          memoryUsers = req.result;
          resolve(req.result);
        };
        req.onerror = () => reject(req.error);
      });
    } catch {
      return memoryUsers;
    }
  }

  async getUserById(userId: string): Promise<User | null> {
    if (typeof window === 'undefined') {
      return memoryUsers.find((u) => u.user_id === userId) || null;
    }
    try {
      const db = await getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('users', 'readonly');
        const store = tx.objectStore('users');
        const req = store.get(userId);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      });
    } catch {
      return memoryUsers.find((u) => u.user_id === userId) || null;
    }
  }

  async getUserByLoginId(loginId: string): Promise<User | null> {
    const users = await this.getAllUsers();
    return users.find((u) => u.login_id === loginId) || null;
  }

  async createUser(user: User): Promise<User> {
    if (typeof window === 'undefined') {
      memoryUsers.push(user);
      return user;
    }
    try {
      const db = await getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(['users', 'audit_logs'], 'readwrite');
        const store = tx.objectStore('users');
        const auditStore = tx.objectStore('audit_logs');

        const req = store.add(user);
        req.onsuccess = () => {
          const auditLog = {
            audit_id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            occurred_at: new Date().toISOString(),
            action: 'CREATE_USER',
            target_type: 'User',
            target_id: user.user_id,
            detail: { login_id: user.login_id, role: user.role },
          };
          auditStore.add(auditLog);
          resolve(user);
        };
        req.onerror = () => reject(req.error);
      });
    } catch {
      memoryUsers.push(user);
      return user;
    }
  }

  async updateUser(user: User): Promise<User> {
    if (typeof window === 'undefined') {
      memoryUsers = memoryUsers.map((u) => (u.user_id === user.user_id ? user : u));
      return user;
    }
    try {
      const db = await getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(['users', 'audit_logs'], 'readwrite');
        const store = tx.objectStore('users');
        const auditStore = tx.objectStore('audit_logs');

        const req = store.put(user);
        req.onsuccess = () => {
          const auditLog = {
            audit_id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            occurred_at: new Date().toISOString(),
            action: 'UPDATE_USER',
            target_type: 'User',
            target_id: user.user_id,
            detail: { login_id: user.login_id, role: user.role },
          };
          auditStore.add(auditLog);
          resolve(user);
        };
        req.onerror = () => reject(req.error);
      });
    } catch {
      memoryUsers = memoryUsers.map((u) => (u.user_id === user.user_id ? user : u));
      return user;
    }
  }

  async deleteUser(userId: string): Promise<void> {
    if (typeof window === 'undefined') {
      memoryUsers = memoryUsers.filter((u) => u.user_id !== userId);
      return;
    }
    try {
      const db = await getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(['users', 'audit_logs'], 'readwrite');
        const store = tx.objectStore('users');
        const auditStore = tx.objectStore('audit_logs');

        const req = store.delete(userId);
        req.onsuccess = () => {
          const auditLog = {
            audit_id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            occurred_at: new Date().toISOString(),
            action: 'DELETE_USER',
            target_type: 'User',
            target_id: userId,
          };
          auditStore.add(auditLog);
          resolve();
        };
        req.onerror = () => reject(req.error);
      });
    } catch {
      memoryUsers = memoryUsers.filter((u) => u.user_id !== userId);
    }
  }
}