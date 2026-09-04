import { Worker } from '@/features/attendance/domain/types';
import { initDB } from '@/lib/db/indexedDB';

export interface IWorkerRepository {
  getWorkersByContractor(contractorId: string): Promise<Worker[]>;
}

export class WorkerRepository implements IWorkerRepository {
  async getWorkersByContractor(contractorId: string): Promise<Worker[]> {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('workers', 'readonly');
      const store = tx.objectStore('workers');
      const index = store.index('contractor_id');
      const request = index.getAll(IDBKeyRange.only(contractorId));

      request.onsuccess = () => {
        const workers = request.result as Worker[];
        // 有効（ACTIVE）な作業員のみをフィルタリング
        resolve(workers.filter(w => w.status === 'ACTIVE'));
      };
      request.onerror = () => {
        reject(request.error);
      };
    });
  }
}