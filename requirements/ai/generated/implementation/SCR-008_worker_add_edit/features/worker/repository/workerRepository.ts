import { Worker } from '../domain/worker';
import { getDB } from '@/lib/db/idb';

export interface WorkerRepository {
  getById(workerId: string, contractorId: string): Promise<Worker | null>;
  save(worker: Worker): Promise<void>;
  update(worker: Worker): Promise<void>;
}

export class IndexedDBWorkerRepository implements WorkerRepository {
  async getById(workerId: string, contractorId: string): Promise<Worker | null> {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('workers', 'readonly');
      const store = transaction.objectStore('workers');
      const request = store.get(workerId);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const worker = request.result as Worker | undefined;
        if (!worker) {
          resolve(null);
          return;
        }
        // 外注先管理者は自社 contractor_id のデータのみ閲覧・操作可
        if (worker.contractor_id !== contractorId) {
          resolve(null);
          return;
        }
        resolve(worker);
      };
    });
  }

  async save(worker: Worker): Promise<void> {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('workers', 'readwrite');
      const store = transaction.objectStore('workers');
      const request = store.add(worker);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async update(worker: Worker): Promise<void> {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('workers', 'readwrite');
      const store = transaction.objectStore('workers');
      const request = store.put(worker);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }
}