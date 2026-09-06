import { WorkerRepository } from '../repository/workerRepository';
import { Worker } from '../domain/types';
import { Result, AppError } from '@/lib/core/result';
import { logger } from '@/lib/logger';

export class GetWorkerByIdUseCase {
  constructor(private workerRepository: WorkerRepository) {}

  async execute(workerId: string): Promise<Result<Worker, AppError>> {
    try {
      const worker = await this.workerRepository.findById(workerId);
      if (!worker) {
        return {
          success: false,
          error: new AppError('作業員が見つかりません。', 'NOT_FOUND'),
        };
      }
      return { success: true, value: worker };
    } catch (e) {
      logger.error('GET_WORKER_BY_ID_ERROR', e, { workerId });
      return {
        success: false,
        error: new AppError('作業員情報の取得に失敗しました。', 'DATABASE_ERROR'),
      };
    }
  }
}