import { WorkerRepository } from '../repository/workerRepository';
import { Worker } from '../domain/types';
import { Result, AppError } from '@/lib/core/result';
import { logger } from '@/lib/logger';

export class GetWorkersUseCase {
  constructor(private workerRepository: WorkerRepository) {}

  async execute(contractorId: string): Promise<Result<Worker[], AppError>> {
    try {
      const workers = await this.workerRepository.findByContractorId(contractorId);
      return { success: true, value: workers };
    } catch (e) {
      logger.error('GET_WORKERS_ERROR', e, { contractorId });
      return {
        success: false,
        error: new AppError('作業員一覧の取得に失敗しました。', 'DATABASE_ERROR'),
      };
    }
  }
}