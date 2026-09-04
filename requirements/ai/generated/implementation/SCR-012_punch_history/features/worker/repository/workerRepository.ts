import { openDatabase } from '../../../lib/db/indexedDb';
import { Worker } from '../../attendance/domain/types';

export interface WorkerRepository {
  findAll(): Promise<Worker[]>;
}

export class IndexedDBWorkerRepository implements WorkerRepository {
  async findAll(): Promise<Worker[]> {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('workers', 'readonly');
      const store = tx.objectStore('workers');
      const req = store.getAll();

      req.onsuccess = () => {
        resolve(req.result || []);
      };
      req.onerror = () => reject(req.error);
    });
  }
}