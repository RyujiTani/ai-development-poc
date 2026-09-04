import { Result } from '../../../lib/error/appError';
import { Worker } from '../domain/worker';
import { WorkerRepository } from '../repository/workerRepository';
import { logger } from '../../../lib/logger/logger';

export class GetWorkerByIdUseCase {
  constructor(private workerRepository: WorkerRepository) {}

  async execute(workerId: string): Promise<Result<Worker>> {
    try {
      logger.info('get_worker_by_id_attempt', { worker_id: workerId });
      const worker = await this.workerRepository.findById(workerId);
      if (!worker) {
        logger.warn('get_worker_by_id_not_found', { worker_id: workerId });
        return {
          success: false,
          error: { code: 'NOT_FOUND', message: '作業員が見つかりません。' },
        };
      }
      logger.info('get_worker_by_id_success', { worker_id: workerId });
      return { success: true, value: worker };
    } catch (error) {
      logger.error('get_worker_by_id_failed', error, { worker_id: workerId });
      return {
        success: false,
        error: { code: 'SYSTEM_ERROR', message: '作業員の取得に失敗しました。' },
      };
    }
  }
}