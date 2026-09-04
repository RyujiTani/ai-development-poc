import { Worker } from '../domain/worker';
import { workerRepository, WorkerRepository } from '../repository/workerRepository';

export interface AppError {
  message: string;
}

export type Result<T> = 
  | { success: true; data: T }
  | { success: false; error: AppError };

export class WorkerUseCase {
  constructor(private repo: WorkerRepository = workerRepository) {}

  async getWorker(workerId: string): Promise<Result<Worker>> {
    try {
      const worker = await this.repo.getById(workerId);
      if (!worker) {
        return { success: false, error: { message: '対象の作業員が見つかりません。' } };
      }
      return { success: true, data: worker };
    } catch (e: any) {
      return { success: false, error: { message: e.message || '作業員情報の取得に失敗しました。' } };
    }
  }

  async createWorker(
    workerData: Omit<Worker, 'worker_id' | 'created_at' | 'updated_at'>
  ): Promise<Result<Worker>> {
    try {
      const created = await this.repo.create(workerData);
      return { success: true, data: created };
    } catch (e: any) {
      return { success: false, error: { message: e.message || '作業員の新規登録に失敗しました。' } };
    }
  }

  async updateWorker(
    workerId: string,
    workerData: Partial<Worker>
  ): Promise<Result<Worker>> {
    try {
      const updated = await this.repo.update(workerId, workerData);
      return { success: true, data: updated };
    } catch (e: any) {
      return { success: false, error: { message: e.message || '作業員の更新に失敗しました。' } };
    }
  }
}

export const workerUseCase = new WorkerUseCase();