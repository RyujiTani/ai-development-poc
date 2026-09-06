import { getDB } from "@/lib/db/indexedDB";
import { Contractor } from "../domain/Contractor";
import { IContractorRepository } from "./contractorRepository";

export class IndexedDBContractorRepository implements IContractorRepository {
  async getAllContractors(): Promise<Contractor[]> {
    const db = await getDB();
    const tx = db.transaction("contractors", "readonly");
    const contractors = await tx.store.getAll();
    await tx.done;
    return contractors as Contractor[];
  }

  async getContractorById(id: string): Promise<Contractor | null> {
    const db = await getDB();
    const tx = db.transaction("contractors", "readonly");
    const contractor = await tx.store.get(id);
    await tx.done;
    return (contractor as Contractor) || null;
  }

  async saveContractor(contractor: Contractor): Promise<void> {
    const db = await getDB();
    const tx = db.transaction("contractors", "readwrite");
    await tx.store.put(contractor);
    await tx.done;
  }

  async deleteContractor(id: string): Promise<void> {
    const db = await getDB();
    const tx = db.transaction("contractors", "readwrite");
    await tx.store.delete(id);
    await tx.done;
  }

  async hasWorkers(contractorId: string): Promise<boolean> {
    const db = await getDB();
    const tx = db.transaction("workers", "readonly");
    const index = tx.store.index("by-contractor-id");
    const workers = await index.getAll(contractorId);
    await tx.done;
    return workers.length > 0;
  }
}