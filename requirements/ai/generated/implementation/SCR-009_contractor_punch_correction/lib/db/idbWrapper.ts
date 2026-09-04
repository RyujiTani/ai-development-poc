import { Worker, AttendanceRecord, AttendanceCorrection, Contractor, User } from '@/features/attendance/domain/types';

const DB_NAME = 'worker_attendance_db';
const DB_VERSION = 1;

export class IdbWrapper {
  private db: IDBDatabase | null = null;

  public async init(): Promise<IDBDatabase> {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      // テスト環境などブラウザではない場合のケア
      if (typeof window === 'undefined' || !window.indexedDB) {
        reject(new Error('IndexedDB is not supported in this environment.'));
        return;
      }

      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (!db.objectStoreNames.contains('contractors')) {
          db.createObjectStore('contractors', { keyPath: 'contractor_id' });
        }
        if (!db.objectStoreNames.contains('users')) {
          db.createObjectStore('users', { keyPath: 'user_id' });
        }
        if (!db.objectStoreNames.contains('workers')) {
          const store = db.createObjectStore('workers', { keyPath: 'worker_id' });
          store.createIndex('contractor_id', 'contractor_id', { unique: false });
        }
        if (!db.objectStoreNames.contains('attendance_records')) {
          const store = db.createObjectStore('attendance_records', { keyPath: 'attendance_id' });
          store.createIndex('contractor_id', 'contractor_id', { unique: false });
          store.createIndex('worker_id', 'worker_id', { unique: false });
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
      };

      request.onsuccess = async (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        await this.seedIfNeeded();
        resolve(this.db);
      };

      request.onerror = (event) => {
        reject((event.target as IDBOpenDBRequest).error);
      };
    });
  }

  private async seedIfNeeded() {
    const workersCount = await this.count('workers');
    if (workersCount === 0) {
      // 初期シードデータを投入する
      const initialContractors: Contractor[] = [
        {
          contractor_id: 'CON-001',
          name: '株式会社 山田工業',
          status: 'ACTIVE',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          contractor_id: 'CON-002',
          name: '佐藤建設 有限会社',
          status: 'ACTIVE',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];

      const initialUsers: User[] = [
        {
          user_id: 'USR-001',
          contractor_id: 'CON-001',
          role: 'CONTRACTOR_MANAGER',
          login_id: 'contractor1',
          password_hash: 'hashed_password_1',
          display_name: '山田 太郎（管理者）',
          status: 'ACTIVE',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          user_id: 'USR-002',
          contractor_id: 'CON-002',
          role: 'CONTRACTOR_MANAGER',
          login_id: 'contractor2',
          password_hash: 'hashed_password_2',
          display_name: '佐藤 二郎（管理者）',
          status: 'ACTIVE',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];

      const initialWorkers: Worker[] = [
        {
          worker_id: 'WRK-001',
          contractor_id: 'CON-001',
          name: '鈴木 茂',
          contact: '090-1111-2222',
          qualifications: ['QL-01', 'QL-02'],
          trainings: [{ code: 'TR-01', taken_at: '2025-10-01' }],
          status: 'ACTIVE',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          worker_id: 'WRK-002',
          contractor_id: 'CON-001',
          name: '高橋 一郎',
          contact: '090-3333-4444',
          qualifications: [],
          trainings: [],
          status: 'ACTIVE',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          worker_id: 'WRK-003',
          contractor_id: 'CON-002',
          name: '渡辺 健二',
          contact: '080-5555-6666',
          qualifications: ['QL-01'],
          trainings: [{ code: 'TR-01', taken_at: '2025-12-15' }],
          status: 'ACTIVE',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];

      const initialAttendance: AttendanceRecord[] = [
        {
          attendance_id: 'ATT-001',
          worker_id: 'WRK-001',
          contractor_id: 'CON-001',
          punch_type: 'CLOCK_IN',
          clocked_at: '2026-04-13T08:00:00+09:00',
          punched_by: 'USR-001',
          photo_object_id: '',
          created_at: '2026-04-13T08:01:00+09:00'
        }
      ];

      for (const c of initialContractors) {
        await this.put('contractors', c);
      }
      for (const u of initialUsers) {
        await this.put('users', u);
      }
      for (const w of initialWorkers) {
        await this.put('workers', w);
      }
      for (const a of initialAttendance) {
        await this.put('attendance_records', a);
      }
    }
  }

  public async count(storeName: string): Promise<number> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.count();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  public async getAll<T>(storeName: string): Promise<T[]> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result as T[]);
      request.onerror = () => reject(request.error);
    });
  }

  public async get<T>(storeName: string, key: string): Promise<T | null> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      request.onsuccess = () => resolve(request.result ? (request.result as T) : null);
      request.onerror = () => reject(request.error);
    });
  }

  public async put<T>(storeName: string, value: T): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(value);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  public async queryIndex<T>(storeName: string, indexName: string, value: any): Promise<T[]> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const index = store.index(indexName);
      const request = index.getAll(value);

      request.onsuccess = () => resolve(request.result as T[]);
      request.onerror = () => reject(request.error);
    });
  }

  public async delete(storeName: string, key: string): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  public async clearAll(): Promise<void> {
    const db = await this.init();
    const stores = ['contractors', 'users', 'workers', 'attendance_records', 'attendance_corrections', 'photo_blobs', 'audit_logs'];
    const transaction = db.transaction(stores, 'readwrite');
    for (const storeName of stores) {
      transaction.objectStore(storeName).clear();
    }
    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }
}

export const idb = new IdbWrapper();