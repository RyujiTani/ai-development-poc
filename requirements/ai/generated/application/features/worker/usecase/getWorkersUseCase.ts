import { Result } from '../../../lib/error/appError';
import { Worker } from '../domain/worker';
import { WorkerRepository } from '../repository/workerRepository';
import { logger } from '../../../lib/logger/logger';

export class GetWorkersUseCase {
  constructor(private workerRepository: WorkerRepository) {}

  async execute(contractorId: string): Promise<Result<Worker[]>> {
    try {
      logger.info('get_workers_attempt', { contractor_id: contractorId });
      const workers = await this.workerRepository.findByContractorId(contractorId);
      logger.info('get_workers_success', { contractor_id: contractorId, count: workers.length });
      return { success: true, value: workers };
    } catch (error) {
      logger.error('get_workers_failed', error, { contractor_id: contractorId });
      return {
        success: false,
        error: { code: 'SYSTEM_ERROR', message: '作業員の取得に失敗しました。' },
      };
    }
  }
}