import { Worker } from '@/features/worker/domain/types';
import { initDB } from '@/lib/db/indexedDb';

export interface IWorkerRepository {
  getWorkersByContractor(contractorId: string): Promise<Worker[]>;
  deleteWorker(workerId: string): Promise<void>;
}

export class WorkerRepository implements IWorkerRepository {
  async getWorkersByContractor(contractorId: string): Promise<Worker[]> {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('workers', 'readonly');
      const store = transaction.objectStore('workers');
      const index = store.index('contractor_id');
      const request = index.getAll(IDBKeyRange.only(contractorId));

      request.onsuccess = () => {
        const workers = (request.result as Worker[]).filter(
          (w) => w.status === 'ACTIVE'
        );
        resolve(workers);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  async deleteWorker(workerId: string): Promise<void> {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('workers', 'readwrite');
      const store = transaction.objectStore('workers');
      const request = store.delete(workerId);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }
}