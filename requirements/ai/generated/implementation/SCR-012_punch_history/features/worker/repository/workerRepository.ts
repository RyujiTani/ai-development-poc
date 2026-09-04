import { initDB } from '../../../lib/db/indexedDbHelper';
import { Worker } from '../domain/types';

export interface WorkerRepository {
  getAll(): Promise<Worker[]>;
}

export class IndexedDBWorkerRepository implements WorkerRepository {
  async getAll(): Promise<Worker[]> {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('workers', 'readonly');
      const store = tx.objectStore('workers');
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }
}