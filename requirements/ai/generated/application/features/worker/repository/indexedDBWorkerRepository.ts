import { initDB } from '@/lib/db';
import { Worker } from '../domain/types';
import { WorkerRepository } from './workerRepository';

export class IndexedDBWorkerRepository implements WorkerRepository {
  async findByContractorId(contractorId: string): Promise<Worker[]> {
    const db = await initDB();
    const tx = db.transaction('workers', 'readonly');
    const store = tx.objectStore('workers');
    const allWorkers = (await store.getAll()) as Worker[];
    await tx.done;

    return allWorkers.filter(
      (w) => w.contractor_id === contractorId && w.status === 'ACTIVE'
    );
  }

  async delete(workerId: string): Promise<void> {
    const db = await initDB();
    const tx = db.transaction('workers', 'readwrite');
    const store = tx.objectStore('workers');
    await store.delete(workerId);
    await tx.done;
  }

  async findById(workerId: string): Promise<Worker | null> {
    const db = await initDB();
    const tx = db.transaction('workers', 'readonly');
    const store = tx.objectStore('workers');
    const allWorkers = (await store.getAll()) as Worker[];
    await tx.done;

    const found = allWorkers.find((w) => w.worker_id === workerId);
    return found || null;
  }

  async save(worker: Worker): Promise<void> {
    const db = await initDB();
    const tx = db.transaction('workers', 'readwrite');
    const store = tx.objectStore('workers');
    await store.put(worker);
    await tx.done;
  }
}