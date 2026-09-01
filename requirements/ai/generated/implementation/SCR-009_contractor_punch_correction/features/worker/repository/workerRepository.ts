import { Worker } from '../domain/worker';
import { openDB } from '@/lib/db/indexedDb';

export interface WorkerRepository {
  getByContractorId(contractorId: string): Promise<Worker[]>;
}

export class IndexedDBWorkerRepository implements WorkerRepository {
  async getByContractorId(contractorId: string): Promise<Worker[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('workers', 'readonly');
      const store = tx.objectStore('workers');
      const index = store.index('contractor_idx');
      const request = index.getAll(contractorId);

      request.onsuccess = () => {
        const workers: Worker[] = request.result || [];
        // ACTIVEな作業員のみにフィルタリング
        resolve(workers.filter(w => w.status === 'ACTIVE'));
      };
      request.onerror = () => reject(request.error);
    });
  }
}
