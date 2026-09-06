import { getDB } from "@/lib/db";

export interface Contractor {
  contractor_id: string;
  name: string;
  status: 'ACTIVE' | 'INACTIVE';
  created_at: string;
  updated_at: string;
}

export async function getContractors(): Promise<Contractor[]> {
  const db = await getDB();
  const tx = db.transaction("contractors", "readonly");
  const store = tx.objectStore("contractors");
  const list = await store.getAll();
  await tx.done;
  return list;
}

export async function createContractor(name: string): Promise<Contractor> {
  const db = await getDB();
  const tx = db.transaction("contractors", "readwrite");
  const store = tx.objectStore("contractors");
  
  const contractor_id = `contractor-${crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)}`;
  const now = new Date().toISOString();
  
  const newContractor: Contractor = {
    contractor_id,
    name,
    status: 'ACTIVE',
    created_at: now,
    updated_at: now,
  };
  
  await store.put(newContractor);
  await tx.done;
  return newContractor;
}

export async function updateContractor(
  contractor_id: string,
  name: string,
  status: 'ACTIVE' | 'INACTIVE'
): Promise<Contractor> {
  const db = await getDB();
  const tx = db.transaction("contractors", "readwrite");
  const store = tx.objectStore("contractors");
  
  const existing = await store.get(contractor_id);
  if (!existing) {
    throw new Error("外注先企業が見つかりません");
  }
  
  const now = new Date().toISOString();
  const updated: Contractor = {
    ...existing,
    name,
    status,
    updated_at: now,
  };
  
  await store.put(updated);
  await tx.done;
  return updated;
}

export async function deleteContractor(contractor_id: string): Promise<void> {
  const db = await getDB();
  
  // 安全制限: 紐づく作業員（workers）が1件でも存在する場合は削除を拒否
  const workersTx = db.transaction("workers", "readonly");
  const workersStore = workersTx.objectStore("workers");
  const allWorkers = await workersStore.getAll();
  await workersTx.done;
  
  const hasWorkers = allWorkers.some((w: any) => w.contractor_id === contractor_id);
  if (hasWorkers) {
    throw new Error("この企業には登録作業員が存在するため削除できません");
  }
  
  const tx = db.transaction("contractors", "readwrite");
  const store = tx.objectStore("contractors");
  await store.delete(contractor_id);
  await tx.done;
}