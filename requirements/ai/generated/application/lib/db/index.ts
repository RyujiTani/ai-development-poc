const DB_NAME = 'worker_attendance_db';
const DB_VERSION = 2;

export interface SimpleStore {
  count(): Promise<number>;
  put(value: any): Promise<any>;
  getAll(): Promise<any[]>;
  delete(key: any): Promise<any>;
}

export interface SimpleTx {
  objectStore(name: string): SimpleStore;
  done: Promise<void>;
}

export interface SimpleDB {
  transaction(storeNames: string | string[], mode?: 'readonly' | 'readwrite'): SimpleTx;
  close(): void;
}

export async function initDB(): Promise<SimpleDB> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      resolve({
        transaction: () => ({
          objectStore: () => ({
            count: async () => 0,
            put: async () => null,
            getAll: async () => [],
            delete: async () => null,
          }),
          done: Promise.resolve(),
        }),
        close: () => {},
      });
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('users')) {
        db.createObjectStore('users', { keyPath: 'user_id' });
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
      if (!db.objectStoreNames.contains('audit_logs')) {
        db.createObjectStore('audit_logs', { keyPath: 'audit_id' });
      }
    };

    request.onsuccess = () => {
      const db = request.result;
      resolve({
        transaction(storeNames: string | string[], mode: 'readonly' | 'readwrite' = 'readonly') {
          const tx = db.transaction(storeNames, mode);
          
          const done = new Promise<void>((res, rej) => {
            tx.oncomplete = () => res();
            tx.onerror = () => rej(tx.error);
            tx.onabort = () => rej(new Error('Transaction aborted'));
          });

          return {
            objectStore(name: string) {
              const store = tx.objectStore(name);
              return {
                count() {
                  return new Promise<number>((res, rej) => {
                    const req = store.count();
                    req.onsuccess = () => res(req.result);
                    req.onerror = () => rej(req.error);
                  });
                },
                put(value: any) {
                  return new Promise<any>((res, rej) => {
                    const req = store.put(value);
                    req.onsuccess = () => res(req.result);
                    req.onerror = () => rej(req.error);
                  });
                },
                getAll() {
                  return new Promise<any[]>((res, rej) => {
                    const req = store.getAll();
                    req.onsuccess = () => res(req.result);
                    req.onerror = () => rej(req.error);
                  });
                },
                delete(key: any) {
                  return new Promise<any>((res, rej) => {
                    const req = store.delete(key);
                    req.onsuccess = () => res(req.result);
                    req.onerror = () => rej(req.error);
                  });
                }
              };
            },
            done
          };
        },
        close() {
          db.close();
        }
      });
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

export async function seedDatabase() {
  if (typeof window === 'undefined') return;
  const db = await initDB();
  const tx = db.transaction('users', 'readonly');
  const count = await tx.objectStore('users').count();
  await tx.done;

  if (count === 0) {
    try {
      const response = await fetch('/mocks/seed.json');
      if (response.ok) {
        const data = await response.json();
        const writeTx = db.transaction(['users', 'contractors', 'workers'], 'readwrite');
        if (data.users) {
          for (const user of data.users) {
            await writeTx.objectStore('users').put(user);
          }
        }
        if (data.contractors) {
          for (const con of data.contractors) {
            await writeTx.objectStore('contractors').put(con);
          }
        }
        if (data.workers) {
          for (const worker of data.workers) {
            await writeTx.objectStore('workers').put(worker);
          }
        }
        await writeTx.done;
      }
    } catch (e) {
      console.error('Failed to seed database:', e);
    }
  }
}