import { Result } from '../../../lib/error/appError';
import { WorkerRepository } from '../repository/workerRepository';
import { logger } from '../../../lib/logger/logger';

export class DeleteWorkerUseCase {
  constructor(private workerRepository: WorkerRepository) {}

  async execute(workerId: string): Promise<Result<void>> {
    try {
      logger.info('delete_worker_attempt', { worker_id: workerId });
      const worker = await this.workerRepository.findById(workerId);
      if (!worker) {
        logger.warn('delete_worker_not_found', { worker_id: workerId });
        return {
          success: false,
          error: { code: 'NOT_FOUND', message: '作業員が見つかりません。' },
        };
      }

      // 論理削除（status を RETIRED に変更し、退職日を設定）
      worker.status = 'RETIRED';
      worker.retired_at = new Date().toISOString();
      worker.updated_at = new Date().toISOString();

      await this.workerRepository.save(worker);
      logger.info('delete_worker_success', { worker_id: workerId });
      return { success: true, value: undefined };
    } catch (error) {
      logger.error('delete_worker_failed', error, { worker_id: workerId });
      return {
        success: false,
        error: { code: 'SYSTEM_ERROR', message: '作業員の削除に失敗しました。' },
      };
    }
  }
}