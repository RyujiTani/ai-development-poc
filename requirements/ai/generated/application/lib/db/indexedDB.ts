import { logger } from '@/lib/logger';

const DB_NAME = 'worker_attendance_db';
const DB_VERSION = 1;

export interface SimpleIndex {
  get(key: any): Promise<any>;
  getAll(key: any): Promise<any[]>;
}

export interface SimpleObjectStore {
  index(name: string): SimpleIndex;
  get(key: any): Promise<any>;
  put(item: any): Promise<any>;
  delete(key: any): Promise<any>;
  getAll(): Promise<any[]>;
}

export interface SimpleTransaction {
  objectStore(name: string): SimpleObjectStore;
  done: Promise<void>;
}

export interface SimpleDB {
  transaction(storeNames: string | string[], mode?: 'readonly' | 'readwrite'): SimpleTransaction;
  count(storeName: string): Promise<number>;
}

function wrapDatabase(db: IDBDatabase): SimpleDB {
  return {
    transaction(storeNames: string | string[], mode: 'readonly' | 'readwrite' = 'readonly'): SimpleTransaction {
      const tx = db.transaction(storeNames, mode);
      const donePromise = new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(new Error('Transaction aborted'));
      });

      return {
        objectStore(name: string): SimpleObjectStore {
          const store = tx.objectStore(name);
          return {
            index(indexName: string): SimpleIndex {
              const idx = store.index(indexName);
              return {
                get(key: any): Promise<any> {
                  return new Promise((resolve, reject) => {
                    const req = idx.get(key);
                    req.onsuccess = () => resolve(req.result);
                    req.onerror = () => reject(req.error);
                  });
                },
                getAll(key: any): Promise<any[]> {
                  return new Promise((resolve, reject) => {
                    const req = idx.getAll(key);
                    req.onsuccess = () => resolve(req.result);
                    req.onerror = () => reject(req.error);
                  });
                }
              };
            },
            get(key: any): Promise<any> {
              return new Promise((resolve, reject) => {
                const req = store.get(key);
                req.onsuccess = () => resolve(req.result);
                req.onerror = () => reject(req.error);
              });
            },
            put(item: any): Promise<any> {
              return new Promise((resolve, reject) => {
                const req = store.put(item);
                req.onsuccess = () => resolve(req.result);
                req.onerror = () => reject(req.error);
              });
            },
            delete(key: any): Promise<any> {
              return new Promise((resolve, reject) => {
                const req = store.delete(key);
                req.onsuccess = () => resolve(req.result);
                req.onerror = () => reject(req.error);
              });
            },
            getAll(): Promise<any[]> {
              return new Promise((resolve, reject) => {
                const req = store.getAll();
                req.onsuccess = () => resolve(req.result);
                req.onerror = () => reject(req.error);
              });
            }
          };
        },
        get done() {
          return donePromise;
        }
      };
    },
    count(storeName: string): Promise<number> {
      return new Promise((resolve, reject) => {
        try {
          const tx = db.transaction(storeName, 'readonly');
          const store = tx.objectStore(storeName);
          const req = store.count();
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => reject(req.error);
        } catch (e) {
          reject(e);
        }
      });
    }
  };
}

export async function initDB(): Promise<SimpleDB> {
  if (typeof window === 'undefined') {
    return {
      transaction: () => ({
        objectStore: () => ({
          index: () => ({ get: () => Promise.resolve(), getAll: () => Promise.resolve([]) }),
          get: () => Promise.resolve(),
          put: () => Promise.resolve(),
          delete: () => Promise.resolve(),
          getAll: () => Promise.resolve([])
        }),
        done: Promise.resolve()
      }),
      count: () => Promise.resolve(0)
    };
  }

  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const indexedDBApi = window.indexedDB || (globalThis as any).indexedDB;
    if (!indexedDBApi) {
      reject(new Error('indexedDB is not available'));
      return;
    }
    const request = indexedDBApi.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const dbInstance = request.result;
      if (!dbInstance.objectStoreNames.contains('contractors')) {
        dbInstance.createObjectStore('contractors', { keyPath: 'contractor_id' });
      }
      if (!dbInstance.objectStoreNames.contains('users')) {
        const userStore = dbInstance.createObjectStore('users', { keyPath: 'user_id' });
        userStore.createIndex('login_id', 'login_id', { unique: true });
      }
      if (!dbInstance.objectStoreNames.contains('workers')) {
        const workerStore = dbInstance.createObjectStore('workers', { keyPath: 'worker_id' });
        workerStore.createIndex('contractor_id', 'contractor_id');
      }
      if (!dbInstance.objectStoreNames.contains('attendance_records')) {
        const recordStore = dbInstance.createObjectStore('attendance_records', { keyPath: 'attendance_id' });
        recordStore.createIndex('worker_id', 'worker_id');
        recordStore.createIndex('contractor_id', 'contractor_id');
      }
      if (!dbInstance.objectStoreNames.contains('attendance_corrections')) {
        dbInstance.createObjectStore('attendance_corrections', { keyPath: 'correction_id' });
      }
      if (!dbInstance.objectStoreNames.contains('photo_blobs')) {
        dbInstance.createObjectStore('photo_blobs', { keyPath: 'photo_object_id' });
      }
      if (!dbInstance.objectStoreNames.contains('audit_logs')) {
        dbInstance.createObjectStore('audit_logs', { keyPath: 'audit_id' });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });

  const wrapped = wrapDatabase(db);
  await seedDataIfEmpty(wrapped);
  return wrapped;
}

async function seedDataIfEmpty(db: SimpleDB) {
  const userCount = await db.count('users');
  if (userCount > 0) {
    return;
  }

  logger.info('SEED_DATA_IMPORT_START');
  try {
    const res = await fetch('/mocks/seed.json');
    if (!res.ok) {
      throw new Error('Seed file not found');
    }
    const data = await res.json();
    await importSeed(db, data);
  } catch (err) {
    logger.warn('SEED_FETCH_FAILED_USING_FALLBACK');
    const fallbackData = {
      contractors: [
        {
          contractor_id: 'c1-uuid',
          name: '第一建設',
          status: 'ACTIVE',
          created_at: '2026-04-13T00:00:00Z',
          updated_at: '2026-04-13T00:00:00Z'
        }
      ],
      users: [
        {
          user_id: 'u1-uuid',
          contractor_id: 'c1-uuid',
          role: 'CONTRACTOR_MANAGER',
          login_id: 'subcon1',
          password_hash: 'password123',
          display_name: '田中 職長',
          status: 'ACTIVE',
          created_at: '2026-04-13T00:00:00Z',
          updated_at: '2026-04-13T00:00:00Z'
        }
      ],
      workers: [],
      attendance_records: [],
      attendance_corrections: [],
      photo_blobs: [],
      audit_logs: []
    };
    await importSeed(db, fallbackData);
  }
}

async function importSeed(db: SimpleDB, data: any) {
  const tx = db.transaction(
    ['contractors', 'users', 'workers', 'attendance_records', 'attendance_corrections', 'photo_blobs', 'audit_logs'],
    'readwrite'
  );

  for (const item of data.contractors || []) {
    await tx.objectStore('contractors').put(item);
  }
  for (const item of data.users || []) {
    await tx.objectStore('users').put(item);
  }
  for (const item of data.workers || []) {
    await tx.objectStore('workers').put(item);
  }
  for (const item of data.attendance_records || []) {
    await tx.objectStore('attendance_records').put(item);
  }
  for (const item of data.attendance_corrections || []) {
    await tx.objectStore('attendance_corrections').put(item);
  }
  for (const item of data.photo_blobs || []) {
    await tx.objectStore('photo_blobs').put(item);
  }
  for (const item of data.audit_logs || []) {
    await tx.objectStore('audit_logs').put(item);
  }

  await tx.done;
  logger.info('SEED_DATA_IMPORT_SUCCESS');
}