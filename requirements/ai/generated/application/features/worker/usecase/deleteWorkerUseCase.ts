import { WorkerRepository } from '../repository/workerRepository';
import { Result, AppError } from '@/lib/core/result';
import { logger } from '@/lib/logger';

export class DeleteWorkerUseCase {
  constructor(private workerRepository: WorkerRepository) {}

  async execute(workerId: string): Promise<Result<void, AppError>> {
    try {
      await this.workerRepository.delete(workerId);
      logger.info('DELETE_WORKER_SUCCESS', { workerId });
      return { success: true, value: undefined };
    } catch (e) {
      logger.error('DELETE_WORKER_ERROR', e, { workerId });
      return {
        success: false,
        error: new AppError('作業員の削除に失敗しました。', 'DATABASE_ERROR'),
      };
    }
  }
}