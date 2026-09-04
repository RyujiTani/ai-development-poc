import { User } from '@/features/user/domain/user';
import { Contractor } from '@/features/contractor/domain/contractor';

const DB_NAME = 'worker_attendance_db';
const DB_VERSION = 1;

export function getDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('IndexedDB is only available in browser'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('users')) {
        db.createObjectStore('users', { keyPath: 'user_id' });
      }
      if (!db.objectStoreNames.contains('contractors')) {
        db.createObjectStore('contractors', { keyPath: 'contractor_id' });
      }
      if (!db.objectStoreNames.contains('audit_logs')) {
        db.createObjectStore('audit_logs', { keyPath: 'audit_id' });
      }
    };
  });
}

export async function initSeedData() {
  if (typeof window === 'undefined') return;
  try {
    const db = await getDB();
    const tx = db.transaction(['users', 'contractors'], 'readwrite');
    const userStore = tx.objectStore('users');
    const contractorStore = tx.objectStore('contractors');

    const countUsers = await new Promise<number>((resolve) => {
      const req = userStore.count();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(0);
    });

    if (countUsers === 0) {
      const contractors: Contractor[] = [
        {
          contractor_id: 'contractor-1',
          name: '株式会社アイウエオ工業',
          status: 'ACTIVE',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          contractor_id: 'contractor-2',
          name: '合同会社カキクケコメンテ',
          status: 'ACTIVE',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      const users: User[] = [
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

      contractors.forEach((c) => contractorStore.put(c));
      users.forEach((u) => userStore.put(u));
    }
  } catch (e) {
    console.warn('Failed to seed IndexedDB, using memory fallback.', e);
  }
}