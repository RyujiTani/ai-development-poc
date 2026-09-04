import { Contractor } from '../domain/contractor';
import { ContractorRepository } from './contractorRepository';
import { getIndexedDB } from '@/lib/db/idb';

export class IndexedDBContractorRepository implements ContractorRepository {
  async findAll(): Promise<Contractor[]> {
    const db = await getIndexedDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('contractors', 'readonly');
      const store = tx.objectStore('contractors');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async findById(id: string): Promise<Contractor | null> {
    const db = await getIndexedDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('contractors', 'readonly');
      const store = tx.objectStore('contractors');
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async save(contractor: Contractor): Promise<Contractor> {
    const db = await getIndexedDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('contractors', 'readwrite');
      const store = tx.objectStore('contractors');
      const request = store.put(contractor);
      request.onsuccess = () => resolve(contractor);
      request.onerror = () => reject(request.error);
    });
  }

  async delete(id: string): Promise<void> {
    const db = await getIndexedDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('contractors', 'readwrite');
      const store = tx.objectStore('contractors');
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}