import { Worker } from '../domain/worker';
import { getDb, saveDb } from '@/lib/db/indexedDb';

export interface WorkerRepository {
  getById(workerId: string): Promise<Worker | null>;
  create(worker: Omit<Worker, 'worker_id' | 'created_at' | 'updated_at'>): Promise<Worker>;
  update(workerId: string, worker: Partial<Worker>): Promise<Worker>;
}

export class MockWorkerRepository implements WorkerRepository {
  async getById(workerId: string): Promise<Worker | null> {
    const db = await getDb();
    const found = db.workers.find((w) => w.worker_id === workerId);
    return found || null;
  }

  async create(worker: Omit<Worker, 'worker_id' | 'created_at' | 'updated_at'>): Promise<Worker> {
    const db = await getDb();
    const newId = `worker-${Math.random().toString(36).substring(2, 11)}`;
    const newWorker: Worker = {
      ...worker,
      worker_id: newId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    db.workers.push(newWorker);
    await saveDb(db);
    return newWorker;
  }

  async update(workerId: string, worker: Partial<Worker>): Promise<Worker> {
    const db = await getDb();
    const index = db.workers.findIndex((w) => w.worker_id === workerId);
    if (index === -1) {
      throw new Error(`Worker with ID ${workerId} not found`);
    }
    const updatedWorker: Worker = {
      ...db.workers[index],
      ...worker,
      updated_at: new Date().toISOString()
    };
    db.workers[index] = updatedWorker;
    await saveDb(db);
    return updatedWorker;
  }
}

export const workerRepository = new MockWorkerRepository();