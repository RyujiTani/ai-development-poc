import { Worker } from '@/features/attendance/domain/types';
import { idb } from '@/lib/db/idbWrapper';

export interface IWorkerRepository {
  getByContractor(contractorId: string): Promise<Worker[]>;
}

export class WorkerRepository implements IWorkerRepository {
  public async getByContractor(contractorId: string): Promise<Worker[]> {
    try {
      const allWorkers = await idb.getAll<Worker>('workers');
      // 外注先管理者は自社 contractor_id のデータのみ閲覧・操作可のフィルタ
      return allWorkers.filter(w => w.contractor_id === contractorId && w.status === 'ACTIVE');
    } catch (e) {
      console.error('Failed to load workers from db, using index fallback.', e);
      try {
        return await idb.queryIndex<Worker>('workers', 'contractor_id', contractorId);
      } catch {
        return [];
      }
    }
  }
}

export const workerRepository = new WorkerRepository();