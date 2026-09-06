import { initDB } from '@/lib/db';
import { Contractor } from '../domain/types';
import { ContractorRepository } from './contractorRepository';

export class IndexedDBContractorRepository implements ContractorRepository {
  async getAll(): Promise<Contractor[]> {
    const db = await initDB();
    const tx = db.transaction('contractors', 'readonly');
    const store = tx.objectStore('contractors');
    const contractors = (await store.getAll()) as Contractor[];
    await tx.done;
    return contractors;
  }

  async save(contractor: Contractor): Promise<void> {
    const db = await initDB();
    const tx = db.transaction('contractors', 'readwrite');
    const store = tx.objectStore('contractors');
    await store.put(contractor);
    await tx.done;
  }

  async delete(contractorId: string): Promise<void> {
    const db = await initDB();
    const tx = db.transaction('contractors', 'readwrite');
    const store = tx.objectStore('contractors');
    await store.delete(contractorId);
    await tx.done;
  }

  async findById(contractorId: string): Promise<Contractor | null> {
    const db = await initDB();
    const tx = db.transaction('contractors', 'readonly');
    const store = tx.objectStore('contractors');
    const contractors = (await store.getAll()) as Contractor[];
    await tx.done;
    return contractors.find((c) => c.contractor_id === contractorId) || null;
  }
}