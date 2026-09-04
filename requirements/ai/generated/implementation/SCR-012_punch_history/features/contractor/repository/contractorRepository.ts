import { initDB } from '../../../lib/db/indexedDbHelper';
import { Contractor } from '../domain/types';

export interface ContractorRepository {
  getAll(): Promise<Contractor[]>;
}

export class IndexedDBContractorRepository implements ContractorRepository {
  async getAll(): Promise<Contractor[]> {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('contractors', 'readonly');
      const store = tx.objectStore('contractors');
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }
}