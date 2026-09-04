import { openDatabase } from '../../../lib/db/indexedDb';
import { Contractor } from '../../attendance/domain/types';

export interface ContractorRepository {
  findAll(): Promise<Contractor[]>;
}

export class IndexedDBContractorRepository implements ContractorRepository {
  async findAll(): Promise<Contractor[]> {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('contractors', 'readonly');
      const store = tx.objectStore('contractors');
      const req = store.getAll();

      req.onsuccess = () => {
        resolve(req.result || []);
      };
      req.onerror = () => reject(req.error);
    });
  }
}