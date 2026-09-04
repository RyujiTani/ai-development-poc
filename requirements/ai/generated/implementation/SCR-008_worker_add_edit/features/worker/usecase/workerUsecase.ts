import { Worker } from '../domain/worker';
import { WorkerRepository } from '../repository/workerRepository';

export type AppError = {
  message: string;
  code?: string;
};

export type Result<T, E = AppError> =
  | { success: true; value: T }
  | { success: false; error: E };

export class WorkerUsecase {
  constructor(private workerRepository: WorkerRepository) {}

  async getWorker(workerId: string, contractorId: string): Promise<Result<Worker>> {
    try {
      const worker = await this.workerRepository.getById(workerId, contractorId);
      if (!worker) {
        return { success: false, error: { message: '対象の作業員が見つかりません、またはアクセス権限がありません。' } };
      }
      return { success: true, value: worker };
    } catch {
      return { success: false, error: { message: 'データの取得中にエラーが発生しました。' } };
    }
  }

  async createWorker(
    data: {
      name: string;
      contact: string;
      qualifications: string[];
      trainings: Array<{ code: string; taken_at: string }>;
    },
    contractorId: string
  ): Promise<Result<Worker>> {
    try {
      const newWorker: Worker = {
        worker_id: `W-${crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9)}`,
        contractor_id: contractorId,
        name: data.name,
        contact: data.contact,
        qualifications: data.qualifications,
        trainings: data.trainings,
        status: 'ACTIVE',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await this.workerRepository.save(newWorker);
      return { success: true, value: newWorker };
    } catch {
      return { success: false, error: { message: '作業員の登録に失敗しました。' } };
    }
  }

  async updateWorker(
    workerId: string,
    data: {
      name: string;
      contact: string;
      qualifications: string[];
      trainings: Array<{ code: string; taken_at: string }>;
    },
    contractorId: string
  ): Promise<Result<Worker>> {
    try {
      const existingResult = await this.getWorker(workerId, contractorId);
      if (!existingResult.success) {
        return existingResult;
      }

      const updatedWorker: Worker = {
        ...existingResult.value,
        name: data.name,
        contact: data.contact,
        qualifications: data.qualifications,
        trainings: data.trainings,
        updated_at: new Date().toISOString(),
      };

      await this.workerRepository.update(updatedWorker);
      return { success: true, value: updatedWorker };
    } catch {
      return { success: false, error: { message: '作業員情報の更新に失敗しました。' } };
    }
  }
}