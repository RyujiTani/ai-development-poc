import { Worker } from '../domain/worker';
import { initDB } from '@/lib/db/indexedDB';

export interface WorkerRepository {
  getWorkersByContractor(contractorId: string): Promise<Worker[]>;
  deleteWorker(workerId: string): Promise<void>;
}

export class IndexedDBWorkerRepository implements WorkerRepository {
  async getWorkersByContractor(contractorId: string): Promise<Worker[]> {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('workers', 'readonly');
      const store = transaction.objectStore('workers');
      const index = store.index('contractor_id');
      const request = index.getAll(contractorId);

      request.onsuccess = () => {
        const workers = request.result as Worker[];
        // Retrieve only active workers for active display
        resolve(workers.filter(w => w.status === 'ACTIVE'));
      };

      request.onerror = () => reject(request.error);
    });
  }

  async deleteWorker(workerId: string): Promise<void> {
    const db = await initDB();
    return new Promise<void>((resolve, reject) => {
      const transaction = db.transaction('workers', 'readwrite');
      const store = transaction.objectStore('workers');
      const request = store.delete(workerId);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}
"
    },
    {