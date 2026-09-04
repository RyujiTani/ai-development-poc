import { initDB } from './indexedDB';
import { User } from '@/features/user/domain/user';

export function hashPassword(password: string): string {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(16);
}

const SEED_USERS: User[] = [
  {
    user_id: 'user-contractor-1',
    contractor_id: 'contractor-1',
    role: 'CONTRACTOR_MANAGER',
    login_id: 'contractor1',
    password_hash: hashPassword('password123'),
    display_name: '外注先 A 職長',
    status: 'ACTIVE',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    user_id: 'user-factory-1',
    contractor_id: null,
    role: 'FACTORY_ADMIN',
    login_id: 'admin1',
    password_hash: hashPassword('admin123'),
    display_name: '工場側管理者',
    status: 'ACTIVE',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export async function seedDatabase(): Promise<void> {
  const db = await initDB();
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(['users'], 'readwrite');
    const store = transaction.objectStore('users');
    
    const countRequest = store.count();
    countRequest.onsuccess = () => {
      if (countRequest.result === 0) {
        SEED_USERS.forEach((user) => {
          store.put(user);
        });
        resolve();
      } else {
        resolve(); // Already seeded
      }
    };
    countRequest.onerror = () => reject(countRequest.error);
  });
}