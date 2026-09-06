import { hashPassword } from '../auth/hash';

// --- Simple inline replacement for 'idb' to avoid package dependency ---
export class MyIDBPDatabase {
  private db: IDBDatabase;

  constructor(db: IDBDatabase) {
    this.db = db;
  }

  get objectStoreNames() {
    return this.db.objectStoreNames;
  }

  createObjectStore(name: string, options?: IDBObjectStoreParameters) {
    const store = this.db.createObjectStore(name, options);
    return new MyIDBObjectStore(store);
  }

  transaction(storeNames: string | string[], mode: IDBTransactionMode = 'readonly') {
    const tx = this.db.transaction(storeNames, mode);
    return new MyIDBPTransaction(tx, storeNames);
  }
}

class MyIDBObjectStore {
  private store: IDBObjectStore;

  constructor(store: IDBObjectStore) {
    this.store = store;
  }

  createIndex(name: string, keyPath: string | string[], options?: IDBIndexParameters) {
    this.store.createIndex(name, keyPath, options);
  }
}

class MyIDBPTransaction {
  private tx: IDBTransaction;
  private storeNames: string | string[];

  constructor(tx: IDBTransaction, storeNames: string | string[]) {
    this.tx = tx;
    this.storeNames = storeNames;
  }

  get store() {
    const name = Array.isArray(this.storeNames) ? this.storeNames[0] : this.storeNames;
    return new MyIDBObjectStoreWithMethods(this.tx.objectStore(name));
  }

  objectStore(name: string) {
    return new MyIDBObjectStoreWithMethods(this.tx.objectStore(name));
  }

  get done(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.tx.oncomplete = () => resolve();
      this.tx.onerror = () => reject(this.tx.error);
      this.tx.onabort = () => reject(new Error('Transaction aborted'));
    });
  }
}

class MyIDBObjectStoreWithMethods {
  private store: IDBObjectStore;

  constructor(store: IDBObjectStore) {
    this.store = store;
  }

  get(key: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const req = this.store.get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  put(value: any, key?: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const req = this.store.put(value, key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  delete(key: any): Promise<void> {
    return new Promise((resolve, reject) => {
      const req = this.store.delete(key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  clear(): Promise<void> {
    return new Promise((resolve, reject) => {
      const req = this.store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  count(): Promise<number> {
    return new Promise((resolve, reject) => {
      const req = this.store.count();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  getAll(key?: any): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const req = this.store.getAll(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  index(name: string) {
    return new MyIDBIndex(this.store.index(name));
  }
}

class MyIDBIndex {
  private index: IDBIndex;

  constructor(idx: IDBIndex) {
    this.index = idx;
  }

  get(key: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const req = this.index.get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  getAll(key?: any): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const req = this.index.getAll(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
}

interface OpenDBOptions {
  upgrade?(db: MyIDBPDatabase, oldVersion: number, newVersion: number | null, transaction: MyIDBPTransaction): void;
}

export function openDB(name: string, version: number, { upgrade }: OpenDBOptions = {}): Promise<MyIDBPDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('IndexedDB is not available on the server side'));
      return;
    }
    const request = window.indexedDB.open(name, version);

    request.onupgradeneeded = (event) => {
      const db = request.result;
      if (upgrade) {
        const myDb = new MyIDBPDatabase(db);
        upgrade(myDb, event.oldVersion, event.newVersion, null as any);
      }
    };

    request.onsuccess = () => {
      resolve(new MyIDBPDatabase(request.result));
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

export type IDBPDatabase<T = any> = MyIDBPDatabase;

const DB_NAME = 'worker-attendance-db';
const DB_VERSION = 1;

export async function getDB(): Promise<IDBPDatabase<any>> {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('contractors')) {
        db.createObjectStore('contractors', { keyPath: 'contractor_id' });
      }
      if (!db.objectStoreNames.contains('users')) {
        const userStore = db.createObjectStore('users', { keyPath: 'user_id' });
        userStore.createIndex('by-login-id', 'login_id', { unique: true });
      }
      if (!db.objectStoreNames.contains('workers')) {
        const workerStore = db.createObjectStore('workers', { keyPath: 'worker_id' });
        workerStore.createIndex('by-contractor-id', 'contractor_id');
      }
      if (!db.objectStoreNames.contains('attendance_records')) {
        db.createObjectStore('attendance_records', { keyPath: 'attendance_id' });
      }
      if (!db.objectStoreNames.contains('attendance_corrections')) {
        db.createObjectStore('attendance_corrections', { keyPath: 'correction_id' });
      }
      if (!db.objectStoreNames.contains('photo_blobs')) {
        db.createObjectStore('photo_blobs', { keyPath: 'photo_object_id' });
      }
      if (!db.objectStoreNames.contains('audit_logs')) {
        db.createObjectStore('audit_logs', { keyPath: 'audit_id' });
      }
    },
  });
}

export async function initializeDB(forceReset = false) {
  const db = await getDB();
  
  const tx = db.transaction('users', 'readonly');
  const count = await tx.store.count();
  await tx.done;

  if (count === 0 || forceReset) {
    if (forceReset) {
      const stores = ['contractors', 'users', 'workers', 'attendance_records', 'attendance_corrections', 'photo_blobs', 'audit_logs'];
      const clearTx = db.transaction(stores, 'readwrite');
      for (const storeName of stores) {
        await clearTx.objectStore(storeName).clear();
      }
      await clearTx.done;
    }

    try {
      const res = await fetch('/mocks/seed.json');
      if (!res.ok) {
        throw new Error('Failed to fetch seed data');
      }
      const seedData = await res.json();

      const writeTx = db.transaction(
        ['contractors', 'users', 'workers', 'attendance_records', 'attendance_corrections', 'photo_blobs', 'audit_logs'],
        'readwrite'
      );

      for (const c of seedData.contractors || []) {
        await writeTx.objectStore('contractors').put(c);
      }

      for (const u of seedData.users || []) {
        const { password_plain, ...userWithoutPlain } = u;
        const password_hash = hashPassword(password_plain || 'password123');
        await writeTx.objectStore('users').put({
          ...userWithoutPlain,
          password_hash,
        });
      }

      for (const w of seedData.workers || []) {
        await writeTx.objectStore('workers').put(w);
      }

      for (const r of seedData.attendance_records || []) {
        await writeTx.objectStore('attendance_records').put(r);
      }
      for (const ac of seedData.attendance_corrections || []) {
        await writeTx.objectStore('attendance_corrections').put(ac);
      }
      for (const p of seedData.photo_blobs || []) {
        await writeTx.objectStore('photo_blobs').put(p);
      }
      for (const al of seedData.audit_logs || []) {
        await writeTx.objectStore('audit_logs').put(al);
      }

      await writeTx.done;
    } catch (error) {
      console.error('Error seeding database:', error);
    }
  }
}