import { Contractor } from '../domain/types';
import { initializeDB } from '@/lib/db/indexedDB';

export interface ContractorRepository {
  findAll(): Promise<Contractor[]>;
  save(contractor: Contractor): Promise<void>;
  update(contractor: Contractor): Promise<void>;
  delete(contractorId: string): Promise<void>;
}

// trace: SCR-014-AP-001
export class IndexedDBContractorRepository implements ContractorRepository {
  // trace: SCR-014-DT-001
  async findAll(): Promise<Contractor[]> {
    const db = await initializeDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['contractors'], 'readonly');
      const store = tx.objectStore('contractors');
      const req = store.getAll();
      req.onsuccess = () => {
        resolve(req.result || []);
      };
      req.onerror = () => reject(req.error);
    });
  }

  // trace: SCR-014-DT-002
  async save(contractor: Contractor): Promise<void> {
    const db = await initializeDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['contractors'], 'readwrite');
      const store = tx.objectStore('contractors');
      const req = store.put(contractor);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  // trace: SCR-014-DT-003
  async update(contractor: Contractor): Promise<void> {
    return this.save(contractor);
  }

  // trace: SCR-014-DT-004
  async delete(contractorId: string): Promise<void> {
    const db = await initializeDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['contractors'], 'readwrite');
      const store = tx.objectStore('contractors');
      const req = store.delete(contractorId);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }
}
"
    },
    {