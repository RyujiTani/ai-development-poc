import { getDB } from "@/lib/db/indexedDB";
import { Worker } from "../domain/Worker";
import { IWorkerRepository } from "./workerRepository";

export class IndexedDBWorkerRepository implements IWorkerRepository {
  async findByContractorId(contractorId: string): Promise<Worker[]> {
    const db = await getDB();
    const tx = db.transaction("workers", "readonly");
    const index = tx.store.index("by-contractor-id");
    const workers = await index.getAll(contractorId);
    await tx.done;
    return workers as Worker[];
  }

  async deleteWorker(workerId: string): Promise<void> {
    const db = await getDB();
    const tx = db.transaction("workers", "readwrite");
    const store = tx.objectStore("workers");
    await store.delete(workerId);
    await tx.done;
  }

  async getWorkerById(workerId: string): Promise<Worker | null> {
    const db = await getDB();
    const tx = db.transaction("workers", "readonly");
    const store = tx.objectStore("workers");
    const worker = await store.get(workerId);
    await tx.done;
    return (worker as Worker) || null;
  }

  async saveWorker(worker: Worker): Promise<void> {
    const db = await getDB();
    const tx = db.transaction("workers", "readwrite");
    const store = tx.objectStore("workers");
    await store.put(worker);
    await tx.done;
  }
}