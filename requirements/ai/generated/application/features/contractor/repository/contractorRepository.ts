import { Contractor } from '../domain/contractor';
import { openDB } from '../../../lib/db/indexedDB';

export interface ContractorRepository {
  findAll(): Promise<Contractor[]>;
  save(contractor: Contractor): Promise<void>;
  delete(contractorId: string): Promise<void>;
  findById(contractorId: string): Promise<Contractor | null>;
}

export class IndexedDBContractorRepository implements ContractorRepository {
  async findAll(): Promise<Contractor[]> {
    const db = await openDB();
    const tx = db.transaction('contractors', 'readonly');
    const store = tx.objectStore('contractors');

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        resolve(request.result || []);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async save(contractor: Contractor): Promise<void> {
    const db = await openDB();
    const tx = db.transaction('contractors', 'readwrite');
    const store = tx.objectStore('contractors');

    return new Promise((resolve, reject) => {
      const request = store.put(contractor);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async delete(contractorId: string): Promise<void> {
    const db = await openDB();
    const tx = db.transaction('contractors', 'readwrite');
    const store = tx.objectStore('contractors');

    return new Promise((resolve, reject) => {
      const request = store.delete(contractorId);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async findById(contractorId: string): Promise<Contractor | null> {
    const db = await openDB();
    const tx = db.transaction('contractors', 'readonly');
    const store = tx.objectStore('contractors');

    return new Promise((resolve, reject) => {
      const request = store.get(contractorId);
      request.onsuccess = () => {
        resolve(request.result || null);
      };
      request.onerror = () => reject(request.error);
    });
  }
}