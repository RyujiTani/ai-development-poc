import { Worker } from '../domain/worker';
import { openDatabase } from '@/lib/db/indexedDb';

export interface IWorkerRepository {
  getById(workerId: string, contractorId: string): Promise<Worker | null>;
  create(worker: Omit<Worker, 'worker_id' | 'created_at' | 'updated_at'>): Promise<Worker>;
  update(
    workerId: string,
    contractorId: string,
    updates: Partial<Omit<Worker, 'worker_id' | 'contractor_id' | 'created_at' | 'updated_at'>>
  ): Promise<Worker>;
}

export class WorkerRepository implements IWorkerRepository {
  async getById(workerId: string, contractorId: string): Promise<Worker | null> {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('workers', 'readonly');
      const store = tx.objectStore('workers');
      const request = store.get(workerId);
      
      request.onsuccess = () => {
        const worker = request.result as Worker | undefined;
        if (!worker) {
          resolve(null);
          return;
        }
        if (worker.contractor_id !== contractorId) {
          reject(new Error('対象データへのアクセス権限がありません。'));
          return;
        }
        resolve(worker);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async create(workerData: Omit<Worker, 'worker_id' | 'created_at' | 'updated_at'>): Promise<Worker> {
    const db = await openDatabase();
    const newWorker: Worker = {
      ...workerData,
      worker_id: `worker-${crypto.randomUUID()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    return new Promise((resolve, reject) => {
      const tx = db.transaction('workers', 'readwrite');
      const store = tx.objectStore('workers');
      const request = store.add(newWorker);
      
      request.onsuccess = () => resolve(newWorker);
      request.onerror = () => reject(request.error);
    });
  }

  async update(
    workerId: string,
    contractorId: string,
    updates: Partial<Omit<Worker, 'worker_id' | 'contractor_id' | 'created_at' | 'updated_at'>>
  ): Promise<Worker> {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('workers', 'readwrite');
      const store = tx.objectStore('workers');
      const getRequest = store.get(workerId);

      getRequest.onsuccess = () => {
        const worker = getRequest.result as Worker | undefined;
        if (!worker) {
          reject(new Error('対象の作業員が見つかりません。'));
          return;
        }
        if (worker.contractor_id !== contractorId) {
          reject(new Error('対象データへのアクセス権限がありません。'));
          return;
        }

        const updatedWorker: Worker = {
          ...worker,
          ...updates,
          updated_at: new Date().toISOString()
        };

        const putRequest = store.put(updatedWorker);
        putRequest.onsuccess = () => resolve(updatedWorker);
        putRequest.onerror = () => reject(putRequest.error);
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  }
}
"
    },
    {