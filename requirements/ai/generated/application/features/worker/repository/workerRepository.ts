import { Worker } from '../domain/worker';
import { openDB } from '../../../lib/db/indexedDB';

export interface WorkerRepository {
  findByContractorId(contractorId: string): Promise<Worker[]>;
  save(worker: Worker): Promise<void>;
  findById(workerId: string): Promise<Worker | null>;
  findAll(): Promise<Worker[]>;
}

export class IndexedDBWorkerRepository implements WorkerRepository {
  async findByContractorId(contractorId: string): Promise<Worker[]> {
    const db = await openDB();
    const tx = db.transaction('workers', 'readonly');
    const store = tx.objectStore('workers');

    return new Promise((resolve, reject) => {
      const request = store.openCursor();
      const results: Worker[] = [];

      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          const worker = cursor.value as Worker;
          if (worker.contractor_id === contractorId && worker.status === 'ACTIVE') {
            results.push(worker);
          }
          cursor.continue();
        } else {
          resolve(results);
        }
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  async save(worker: Worker): Promise<void> {
    const db = await openDB();
    const tx = db.transaction('workers', 'readwrite');
    const store = tx.objectStore('workers');

    return new Promise((resolve, reject) => {
      const request = store.put(worker);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async findById(workerId: string): Promise<Worker | null> {
    const db = await openDB();
    const tx = db.transaction('workers', 'readonly');
    const store = tx.objectStore('workers');

    return new Promise((resolve, reject) => {
      const request = store.get(workerId);
      request.onsuccess = () => {
        resolve(request.result || null);
      };
      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  async findAll(): Promise<Worker[]> {
    const db = await openDB();
    const tx = db.transaction('workers', 'readonly');
    const store = tx.objectStore('workers');

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        resolve(request.result || []);
      };
      request.onerror = () => reject(request.error);
    });
  }
}