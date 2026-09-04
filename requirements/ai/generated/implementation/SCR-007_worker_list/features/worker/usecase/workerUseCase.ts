import { Worker } from '@/features/worker/domain/types';
import { IWorkerRepository } from '@/features/worker/repository/workerRepository';

export type AppError = {
  message: string;
};

export type Result<T, E = AppError> = 
  | { success: true; data: T } 
  | { success: false; error: E };

export class WorkerUseCase {
  constructor(private repository: IWorkerRepository) {}

  async getWorkers(contractorId: string): Promise<Result<Worker[]>> {
    try {
      const workers = await this.repository.getWorkersByContractorId(contractorId);
      return { success: true, data: workers };
    } catch (e: any) {
      return {
        success: false,
        error: { message: e.message || '作業員一覧の取得に失敗しました。' }
      };
    }
  }

  async deleteWorker(workerId: string, contractorId: string): Promise<Result<void>> {
    try {
      await this.repository.deleteWorker(workerId, contractorId);
      return { success: true, data: undefined };
    } catch (e: any) {
      return {
        success: false,
        error: { message: e.message || '作業員の削除に失敗しました。' }
      };
    }
  }
}