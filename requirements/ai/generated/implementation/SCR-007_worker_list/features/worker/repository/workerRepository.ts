import { Worker } from '@/features/worker/domain/types';
import { getDB } from '@/lib/db/indexedDb';

export interface IWorkerRepository {
  getWorkersByContractorId(contractorId: string): Promise<Worker[]>;
  deleteWorker(workerId: string, contractorId: string): Promise<void>;
}

export class WorkerRepository implements IWorkerRepository {
  async getWorkersByContractorId(contractorId: string): Promise<Worker[]> {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('workers', 'readonly');
      const store = transaction.objectStore('workers');
      const index = store.index('contractor_id');
      const request = index.getAll(IDBKeyRange.only(contractorId));

      request.onsuccess = () => {
        // Filter out active workers (exclude retired ones if any, but default list displays all non-retired)
        const allWorkers = request.result as Worker[];
        const activeWorkers = allWorkers.filter((w) => w.status === 'ACTIVE');
        resolve(activeWorkers);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  async deleteWorker(workerId: string, contractorId: string): Promise<void> {
    const db = await getDB();
    
    // First, verify the worker belongs to the specified contractor_id
    const worker = await this.getWorkerById(db, workerId);
    if (!worker) {
      throw new Error('指定された作業員が見つかりません。');
    }
    if (worker.contractor_id !== contractorId) {
      throw new Error('他社の作業員を削除する権限がありません。');
    }

    return new Promise((resolve, reject) => {
      const transaction = db.transaction('workers', 'readwrite');
      const store = transaction.objectStore('workers');
      
      // Perform physical deletion based on requirement resolution (AMB-SCR-007-001)
      const request = store.delete(workerId);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  private getWorkerById(db: IDBDatabase, workerId: string): Promise<Worker | null> {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('workers', 'readonly');
      const store = transaction.objectStore('workers');
      const request = store.get(workerId);

      request.onsuccess = () => {
        resolve(request.result || null);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }
}