import { initDB } from '@/lib/db/indexedDB';
import { Worker } from '@/features/attendance/domain/types';

export const workerRepository = {
  async getWorkersByContractor(contractorId: string): Promise<Worker[]> {
    const db = await initDB();
    const tx = db.transaction('workers', 'readonly');
    const store = tx.objectStore('workers');
    const index = store.index('contractor_id');
    const list = (await index.getAll(contractorId)) as Worker[];
    return list;
  },

  async getWorkerById(workerId: string): Promise<Worker | null> {
    const db = await initDB();
    const tx = db.transaction('workers', 'readonly');
    const store = tx.objectStore('workers');
    const worker = (await store.get(workerId)) as Worker | undefined;
    return worker || null;
  },

  async createWorker(workerData: {
    contractor_id: string;
    name: string;
    contact?: string;
    qualifications: string[];
    trainings: Array<{ code: string; taken_at: string }>;
    status: 'ACTIVE' | 'RETIRED';
  }): Promise<{ success: boolean; worker_id: string }> {
    const db = await initDB();
    const tx = db.transaction('workers', 'readwrite');
    const store = tx.objectStore('workers');
    const worker_id = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : Math.random().toString(36).substring(2);
    
    const now = new Date().toISOString();
    const newWorker: Worker = {
      ...workerData,
      worker_id,
      created_at: now,
      updated_at: now,
    };
    await store.put(newWorker);
    await tx.done;
    return { success: true, worker_id };
  },

  async updateWorker(workerId: string, workerData: {
    name: string;
    contact?: string;
    qualifications: string[];
    trainings: Array<{ code: string; taken_at: string }>;
    status: 'ACTIVE' | 'RETIRED';
  }): Promise<{ success: boolean }> {
    const db = await initDB();
    const tx = db.transaction('workers', 'readwrite');
    const store = tx.objectStore('workers');
    const existing = (await store.get(workerId)) as Worker | undefined;
    if (!existing) {
      throw new Error('Worker not found');
    }
    const updatedWorker: Worker = {
      ...existing,
      ...workerData,
      updated_at: new Date().toISOString(),
    };
    await store.put(updatedWorker);
    await tx.done;
    return { success: true };
  },

  async deleteWorker(workerId: string): Promise<{ success: boolean }> {
    const db = await initDB();
    const tx = db.transaction('workers', 'readwrite');
    const store = tx.objectStore('workers');
    await store.delete(workerId);
    await tx.done;
    return { success: true };
  }
};