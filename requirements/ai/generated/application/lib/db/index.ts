import { User } from '@/features/user/domain/types';

const DB_NAME = 'worker_attendance_db';
const DB_VERSION = 1;

// 簡易的な idb 互換ラッパーの型定義
export interface SimpleDB {
  transaction(storeNames: string | string[], mode?: 'readonly' | 'readwrite'): SimpleTransaction;
}

export interface SimpleTransaction {
  objectStore(name: string): SimpleObjectStore;
  done: Promise<void>;
}

export interface SimpleObjectStore {
  index(name: string): SimpleIndex;
  get(key: any): Promise<any>;
  put(value: any): Promise<any>;
  delete(key: any): Promise<void>;
  count(): Promise<number>;
  clear(): Promise<void>;
  getAll(): Promise<any[]>;
}

export interface SimpleIndex {
  get(key: any): Promise<any>;
}

class SimpleIndexImpl implements SimpleIndex {
  constructor(private rawIndex: IDBIndex) {}

  get(key: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const request = this.rawIndex.get(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
}

class SimpleObjectStoreImpl implements SimpleObjectStore {
  constructor(private rawStore: IDBObjectStore) {}

  index(name: string): SimpleIndex {
    return new SimpleIndexImpl(this.rawStore.index(name));
  }

  get(key: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const request = this.rawStore.get(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  put(value: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const request = this.rawStore.put(value);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  delete(key: any): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = this.rawStore.delete(key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  count(): Promise<number> {
    return new Promise((resolve, reject) => {
      const request = this.rawStore.count();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  clear(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = this.rawStore.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  getAll(): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const request = this.rawStore.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
}

class SimpleTransactionImpl implements SimpleTransaction {
  done: Promise<void>;

  constructor(private rawTx: IDBTransaction) {
    this.done = new Promise<void>((resolve, reject) => {
      rawTx.oncomplete = () => resolve();
      rawTx.onerror = () => reject(rawTx.error);
      rawTx.onabort = () => reject(new Error('Transaction aborted'));
    });
  }

  objectStore(name: string): SimpleObjectStore {
    return new SimpleObjectStoreImpl(this.rawTx.objectStore(name));
  }
}

class SimpleDBImpl implements SimpleDB {
  constructor(private rawDB: IDBDatabase) {}

  transaction(storeNames: string | string[], mode?: 'readonly' | 'readwrite'): SimpleTransaction {
    const rawMode: IDBTransactionMode = mode === 'readwrite' ? 'readwrite' : 'readonly';
    const rawTx = this.rawDB.transaction(storeNames, rawMode);
    return new SimpleTransactionImpl(rawTx);
  }
}

function openDatabase(
  name: string,
  version: number,
  upgradeCallback: (db: IDBDatabase) => void
): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const idb = typeof window !== 'undefined' ? window.indexedDB : (typeof globalThis !== 'undefined' ? globalThis.indexedDB : null);
    if (!idb) {
      reject(new Error('IndexedDB is not supported in this environment'));
      return;
    }
    const request = idb.open(name, version);
    request.onupgradeneeded = () => {
      const db = request.result;
      upgradeCallback(db);
    };
    request.onsuccess = () => {
      resolve(request.result);
    };
    request.onerror = () => {
      reject(request.error);
    };
  });
}

let dbInstance: SimpleDB | null = null;

const fallbackSeed = {
  users: [
    {
      user_id: 'user-1',
      contractor_id: 'contractor-1',
      role: 'CONTRACTOR_MANAGER',
      login_id: 'valid_contractor_manager',
      password_hash: 'Y29ycmVjdF9wYXNzd29yZA==', // btoa('correct_password')
      display_name: '外注先 太郎',
      status: 'ACTIVE',
      created_at: '2026-04-13T00:00:00+09:00',
      updated_at: '2026-04-13T00:00:00+09:00'
    },
    {
      user_id: 'user-admin',
      contractor_id: null,
      role: 'FACTORY_ADMIN',
      login_id: 'valid_factory_admin',
      password_hash: 'Y29ycmVjdF9wYXNzd29yZA==', // btoa('correct_password')
      display_name: '工場側管理者 A',
      status: 'ACTIVE',
      created_at: '2026-04-13T00:00:00+09:00',
      updated_at: '2026-04-13T00:00:00+09:00'
    }
  ],
  contractors: [
    {
      contractor_id: 'contractor-1',
      name: '株式会社 A建設',
      status: 'ACTIVE',
      created_at: '2026-04-13T00:00:00+09:00',
      updated_at: '2026-04-13T00:00:00+09:00'
    }
  ],
  workers: [
    {
      worker_id: 'worker-1',
      contractor_id: 'contractor-1',
      name: '作業員 A',
      status: 'ACTIVE',
      qualifications: ['QUAL-01'],
      trainings: [{ code: 'TRAIN-01', taken_at: '2026-01-10T00:00:00+09:00' }],
      created_at: '2026-04-13T00:00:00+09:00',
      updated_at: '2026-04-13T00:00:00+09:00'
    },
    {
      worker_id: 'worker-2',
      contractor_id: 'contractor-1',
      name: '作業員 B',
      status: 'ACTIVE',
      qualifications: [],
      trainings: [],
      created_at: '2026-04-13T00:00:00+09:00',
      updated_at: '2026-04-13T00:00:00+09:00'
    }
  ]
};

export async function getDB(): Promise<SimpleDB> {
  if (dbInstance) return dbInstance;

  const rawDB = await openDatabase(DB_NAME, DB_VERSION, (db) => {
    if (!db.objectStoreNames.contains('users')) {
      const userStore = db.createObjectStore('users', { keyPath: 'user_id' });
      userStore.createIndex('by-login-id', 'login_id', { unique: true });
    }
    if (!db.objectStoreNames.contains('audit_logs')) {
      db.createObjectStore('audit_logs', { keyPath: 'audit_id' });
    }
    if (!db.objectStoreNames.contains('contractors')) {
      db.createObjectStore('contractors', { keyPath: 'contractor_id' });
    }
    if (!db.objectStoreNames.contains('workers')) {
      db.createObjectStore('workers', { keyPath: 'worker_id' });
    }
    if (!db.objectStoreNames.contains('attendance_records')) {
      db.createObjectStore('attendance_records', { keyPath: 'attendance_id' });
    }
    if (!db.objectStoreNames.contains('photo_blobs')) {
      db.createObjectStore('photo_blobs', { keyPath: 'photo_object_id' });
    }
    if (!db.objectStoreNames.contains('attendance_corrections')) {
      db.createObjectStore('attendance_corrections', { keyPath: 'correction_id' });
    }
  });

  dbInstance = new SimpleDBImpl(rawDB);

  await seedDatabase(dbInstance);

  return dbInstance;
}

async function seedDatabase(db: SimpleDB) {
  const tx = db.transaction('users', 'readonly');
  const count = await tx.objectStore('users').count();
  await tx.done;

  if (count === 0) {
    let seedData = fallbackSeed;
    try {
      if (typeof window !== 'undefined' && window.fetch) {
        const response = await window.fetch('/mocks/seed.json');
        if (response.ok) {
          seedData = await response.json();
        }
      }
    } catch (e) {
      // fetch失敗時はフォールバックデータを使用する
    }

    const writeTx = db.transaction(['users', 'contractors', 'workers'], 'readwrite');
    for (const user of seedData.users) {
      await writeTx.objectStore('users').put(user);
    }
    for (const contractor of seedData.contractors) {
      await writeTx.objectStore('contractors').put(contractor);
    }
    if (seedData.workers) {
      for (const worker of seedData.workers) {
        await writeTx.objectStore('workers').put(worker);
      }
    }
    await writeTx.done;
  }
}