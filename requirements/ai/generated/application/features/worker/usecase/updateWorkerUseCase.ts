import { WorkerRepository } from '../repository/workerRepository';
import { Worker } from '../domain/types';
import { Result, AppError } from '@/lib/core/result';
import { logger } from '@/lib/logger';

export interface UpdateWorkerInput {
  workerId: string;
  contractorId: string;
  name: string;
  contact?: string;
  qualifications: string[];
  trainings: Array<{ code: string; taken_at: string }>;
}

export class UpdateWorkerUseCase {
  constructor(private workerRepository: WorkerRepository) {}

  async execute(input: UpdateWorkerInput): Promise<Result<Worker, AppError>> {
    try {
      const existing = await this.workerRepository.findById(input.workerId);
      if (!existing) {
        return {
          success: false,
          error: new AppError('作業員が見つかりません。', 'NOT_FOUND'),
        };
      }

      if (existing.contractor_id !== input.contractorId) {
        return {
          success: false,
          error: new AppError('権限がありません。', 'UNAUTHORIZED'),
        };
      }

      const updatedWorker: Worker = {
        ...existing,
        name: input.name,
        contact: input.contact,
        qualifications: input.qualifications,
        trainings: input.trainings,
        updated_at: new Date().toISOString(),
      };

      await this.workerRepository.save(updatedWorker);
      logger.info('UPDATE_WORKER_SUCCESS', { workerId: input.workerId });
      return { success: true, value: updatedWorker };
    } catch (e) {
      logger.error('UPDATE_WORKER_ERROR', e, { workerId: input.workerId });
      return {
        success: false,
        error: new AppError('作業員の更新に失敗しました。', 'DATABASE_ERROR'),
      };
    }
  }
}