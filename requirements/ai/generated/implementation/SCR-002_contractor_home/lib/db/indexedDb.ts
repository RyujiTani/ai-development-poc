const DB_NAME = 'worker_attendance_db';
const DB_VERSION = 1;

export function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('Browser environment required'));
      return;
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = request.result;
      if (!db.objectStoreNames.contains('users')) {
        db.createObjectStore('users', { keyPath: 'user_id' });
      }
      if (!db.objectStoreNames.contains('contractors')) {
        db.createObjectStore('contractors', { keyPath: 'contractor_id' });
      }
    };

    request.onsuccess = () => {
      const db = request.result;
      seedData(db).then(() => resolve(db)).catch(reject);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

async function seedData(db: IDBDatabase): Promise<void> {
  // すでにデータがあるかチェック
  const hasData = await new Promise<boolean>((resolve) => {
    const transaction = db.transaction('users', 'readonly');
    const store = transaction.objectStore('users');
    const req = store.count();
    req.onsuccess = () => resolve(req.result > 0);
    req.onerror = () => resolve(false);
  });

  if (hasData) return;

  const transaction = db.transaction(['users', 'contractors'], 'readwrite');
  const userStore = transaction.objectStore('users');
  const contractorStore = transaction.objectStore('contractors');

  const mockContractor = {
    contractor_id: 'contractor-1',
    name: '株式会社 ビルドテック',
    status: 'ACTIVE',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const mockUser = {
    user_id: 'user-contractor-1',
    contractor_id: 'contractor-1',
    role: 'CONTRACTOR_MANAGER',
    login_id: 'sub1',
    password_hash: 'mock_hash',
    display_name: '山田 太郎',
    status: 'ACTIVE',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  userStore.put(mockUser);
  contractorStore.put(mockContractor);

  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}