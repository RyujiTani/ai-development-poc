import { Contractor } from '../domain/contractor';
import { initDB } from '@/lib/db/idb';

export interface ContractorRepository {
  getContractors(): Promise<Contractor[]>;
}

export class IndexedDBContractorRepository implements ContractorRepository {
  async getContractors(): Promise<Contractor[]> {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('contractors', 'readonly');
      const store = tx.objectStore('contractors');
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result as Contractor[]);
      req.onerror = () => reject(req.error);
    });
  }
}

let contractorRepositoryInstance: ContractorRepository | null = null;

export function getContractorRepository(): ContractorRepository {
  if (!contractorRepositoryInstance) {
    contractorRepositoryInstance = new IndexedDBContractorRepository();
  }
  return contractorRepositoryInstance;
}

export function setContractorRepository(repo: ContractorRepository | null) {
  contractorRepositoryInstance = repo;
}