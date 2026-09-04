import { Contractor } from '../../features/contractor/domain/contractor';

// ブラウザ環境・テスト環境・SSR環境のすべてで安全に動作するIndexedDB/インメモリハイブリッド・マネージャー
class AppDatabase {
  private dbName = 'worker_attendance_db';
  private version = 1;
  private isBrowser = typeof window !== 'undefined';
  
  // テストやSSR、非対応ブラウザ用のインメモリ・フォールバック
  private inMemoryDb: {
    contractors: Map<string, Contractor>;
  } = {
    contractors: new Map(),
  };

  constructor() {
    this.seedDefaultData();
  }

  private seedDefaultData() {
    const defaultContractors: Contractor[] = [
      {
        contractor_id: 'c1',
        name: '株式会社A建設',
        status: 'ACTIVE',
        created_at: '2026-04-13T00:00:00+09:00',
        updated_at: '2026-04-13T00:00:00+09:00',
      },
      {
        contractor_id: 'c2',
        name: '有限会社B電設',
        status: 'ACTIVE',
        created_at: '2026-04-13T00:00:00+09:00',
        updated_at: '2026-04-13T00:00:00+09:00',
      },
    ];

    defaultContractors.forEach((c) => {
      this.inMemoryDb.contractors.set(c.contractor_id, c);
    });
  }

  // IndexedDBを初期化・取得する関数
  private openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      if (!this.isBrowser || !window.indexedDB) {
        reject(new Error('IndexedDB is not supported in this environment'));
        return;
      }

      const request = window.indexedDB.open(this.dbName, this.version);

      request.onupgradeneeded = (event) => {
        const db = request.result;
        if (!db.objectStoreNames.contains('contractors')) {
          db.createObjectStore('contractors', { keyPath: 'contractor_id' });
        }
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  // データを IndexedDB へ同期（インメモリから初期移行）
  private async syncInMemoryToIDB(db: IDBDatabase): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('contractors', 'readwrite');
      const store = transaction.objectStore('contractors');

      // 既存件数チェック
      const countRequest = store.count();
      countRequest.onsuccess = () => {
        if (countRequest.result === 0) {
          // 空ならインメモリデータを投入
          this.inMemoryDb.contractors.forEach((c) => {
            store.put(c);
          });
        }
        resolve();
      };
      countRequest.onerror = () => {
        reject(countRequest.error);
      };
    });
  }

  // 全件取得
  async getAllContractors(): Promise<Contractor[]> {
    try {
      const db = await this.openDB();
      await this.syncInMemoryToIDB(db);

      return new Promise((resolve, reject) => {
        const transaction = db.transaction('contractors', 'readonly');
        const store = transaction.objectStore('contractors');
        const request = store.getAll();

        request.onsuccess = () => {
          // インメモリキャッシュも同期
          const results = request.result as Contractor[];
          this.inMemoryDb.contractors.clear();
          results.forEach((c) => this.inMemoryDb.contractors.set(c.contractor_id, c));
          resolve(results);
        };

        request.onerror = () => {
          reject(request.error);
        };
      });
    } catch (e) {
      // エラー（非ブラウザ等）の場合はインメモリデータを返す
      return Array.from(this.inMemoryDb.contractors.values());
    }
  }

  // IDで取得
  async getContractorById(id: string): Promise<Contractor | null> {
    try {
      const db = await this.openDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction('contractors', 'readonly');
        const store = transaction.objectStore('contractors');
        const request = store.get(id);

        request.onsuccess = () => {
          resolve((request.result as Contractor) || null);
        };

        request.onerror = () => {
          reject(request.error);
        };
      });
    } catch (e) {
      return this.inMemoryDb.contractors.get(id) || null;
    }
  }

  // 保存・更新
  async putContractor(contractor: Contractor): Promise<void> {
    // 常にインメモリは同期しておく
    this.inMemoryDb.contractors.set(contractor.contractor_id, contractor);

    try {
      const db = await this.openDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction('contractors', 'readwrite');
        const store = transaction.objectStore('contractors');
        const request = store.put(contractor);

        request.onsuccess = () => {
          resolve();
        };

        request.onerror = () => {
          reject(request.error);
        };
      });
    } catch (e) {
      // インメモリで成功しているためそのまま解決
    }
  }

  // 削除
  async deleteContractor(id: string): Promise<void> {
    this.inMemoryDb.contractors.delete(id);

    try {
      const db = await this.openDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction('contractors', 'readwrite');
        const store = transaction.objectStore('contractors');
        const request = store.delete(id);

        request.onsuccess = () => {
          resolve();
        };

        request.onerror = () => {
          reject(request.error);
        };
      });
    } catch (e) {
      // インメモリで成功
    }
  }

  // テスト用等のリセット
  resetDatabase() {
    this.inMemoryDb.contractors.clear();
    this.seedDefaultData();
  }
}

export const dbManager = new AppDatabase();