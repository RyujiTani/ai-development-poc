import { initDB } from '@/lib/db/indexedDB';
import { User, Contractor } from '@/features/attendance/domain/types';

export const userRepository = {
  async getAllUsers(): Promise<Array<User & { contractor_name?: string }>> {
    const db = await initDB();
    const userTx = db.transaction('users', 'readonly');
    const userStore = userTx.objectStore('users');
    const users = (await userStore.getAll()) as User[];

    const contractorTx = db.transaction('contractors', 'readonly');
    const contractorStore = contractorTx.objectStore('contractors');
    const contractors = (await contractorStore.getAll()) as Contractor[];
    const contractorMap = new Map(contractors.map((c) => [c.contractor_id, c.name]));

    return users.map((u) => ({
      ...u,
      contractor_name: u.contractor_id ? contractorMap.get(u.contractor_id) : undefined,
    }));
  },

  async checkLoginIdExists(loginId: string, excludeUserId?: string): Promise<boolean> {
    const db = await initDB();
    const tx = db.transaction('users', 'readonly');
    const store = tx.objectStore('users');
    const index = store.index('login_id');
    const user = (await index.get(loginId)) as User | undefined;
    if (!user) return false;
    if (excludeUserId && user.user_id === excludeUserId) return false;
    return true;
  },

  async checkUserIdExists(userId: string): Promise<boolean> {
    const db = await initDB();
    const tx = db.transaction('users', 'readonly');
    const store = tx.objectStore('users');
    const user = (await store.get(userId)) as User | undefined;
    return !!user;
  },

  async createUser(params: {
    user_id: string;
    login_id: string;
    password_hash: string;
    display_name: string;
    role: 'FACTORY_ADMIN' | 'CONTRACTOR_MANAGER';
    contractor_id: string | null;
  }): Promise<{ success: boolean; error?: string }> {
    const db = await initDB();
    
    // ユーザーID重複チェック
    const isUserIdExists = await this.checkUserIdExists(params.user_id);
    if (isUserIdExists) {
      return { success: false, error: 'このユーザーIDは既に登録されています' };
    }

    // ログインID重複チェック
    const isLoginIdExists = await this.checkLoginIdExists(params.login_id);
    if (isLoginIdExists) {
      return { success: false, error: 'このログインIDは既に登録されています' };
    }

    const tx = db.transaction('users', 'readwrite');
    const store = tx.objectStore('users');
    const now = new Date().toISOString();

    const newUser: User = {
      user_id: params.user_id,
      login_id: params.login_id,
      password_hash: params.password_hash,
      display_name: params.display_name,
      role: params.role,
      contractor_id: params.contractor_id,
      status: 'ACTIVE',
      created_at: now,
      updated_at: now,
    };

    await store.put(newUser);
    await tx.done;
    return { success: true };
  },

  async updateUser(
    userId: string,
    params: {
      login_id: string;
      password_hash?: string;
      display_name: string;
      role: 'FACTORY_ADMIN' | 'CONTRACTOR_MANAGER';
      contractor_id: string | null;
      status: 'ACTIVE' | 'LOCKED' | 'DISABLED';
    }
  ): Promise<{ success: boolean; error?: string }> {
    const db = await initDB();

    const isLoginIdExists = await this.checkLoginIdExists(params.login_id, userId);
    if (isLoginIdExists) {
      return { success: false, error: 'このログインIDは既に他のユーザーに使用されています' };
    }

    const tx = db.transaction('users', 'readwrite');
    const store = tx.objectStore('users');
    const existing = (await store.get(userId)) as User | undefined;
    if (!existing) {
      return { success: false, error: 'ユーザーが見つかりません' };
    }

    const updatedUser: User = {
      ...existing,
      login_id: params.login_id,
      display_name: params.display_name,
      role: params.role,
      contractor_id: params.contractor_id,
      status: params.status,
      updated_at: new Date().toISOString(),
    };

    if (params.password_hash) {
      updatedUser.password_hash = params.password_hash;
    }

    await store.put(updatedUser);
    await tx.done;
    return { success: true };
  },

  async deleteUser(userId: string): Promise<{ success: boolean }> {
    const db = await initDB();
    const tx = db.transaction('users', 'readwrite');
    const store = tx.objectStore('users');
    await store.delete(userId);
    await tx.done;
    return { success: true };
  },
};