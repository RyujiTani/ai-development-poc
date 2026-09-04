import { Contractor } from '../domain/contractor';
import { getDB } from '@/lib/db/indexedDb';

export interface ContractorRepository {
  getActiveContractors(): Promise<Contractor[]>;
}

let memoryContractors: Contractor[] = [
  {
    contractor_id: 'contractor-1',
    name: '株式会社アイウエオ工業',
    status: 'ACTIVE',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    contractor_id: 'contractor-2',
    name: '合同会社カキクケコメンテ',
    status: 'ACTIVE',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export class IndexedDBContractorRepository implements ContractorRepository {
  async getActiveContractors(): Promise<Contractor[]> {
    if (typeof window === 'undefined') return memoryContractors;
    try {
      const db = await getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('contractors', 'readonly');
        const store = tx.objectStore('contractors');
        const req = store.getAll();
        req.onsuccess = () => {
          const list = (req.result as Contractor[]).filter((c) => c.status === 'ACTIVE');
          memoryContractors = list;
          resolve(list);
        };
        req.onerror = () => reject(req.error);
      });
    } catch {
      return memoryContractors;
    }
  }
}