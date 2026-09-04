import { WorkerRepository } from './workerRepository';
import { Worker } from '../domain/worker';
import { openDB } from '@/lib/db/indexedDb';

export class WorkerRepositoryImpl implements WorkerRepository {
  async getByContractorId(contractorId: string): Promise<Worker[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('workers', 'readonly');
      const store = transaction.objectStore('workers');
      const request = store.getAll();

      request.onsuccess = () => {
        const allWorkers = request.result as Worker[];
        const filtered = allWorkers.filter(
          (w) => w.contractor_id === contractorId && w.status === 'ACTIVE'
        );
        resolve(filtered);
      };

      request.onerror = () => reject(request.error);
    });
  }
}