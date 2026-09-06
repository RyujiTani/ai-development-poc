import { ContractorRepository } from '../repository/contractorRepository';
import { Contractor } from '../domain/types';
import { Result, AppError } from '@/lib/core/result';
import { logger } from '@/lib/logger';

export class GetContractorsUseCase {
  constructor(private contractorRepository: ContractorRepository) {}

  async execute(): Promise<Result<Contractor[], AppError>> {
    try {
      const contractors = await this.contractorRepository.getAll();
      return { success: true, value: contractors };
    } catch (e) {
      logger.error('GET_CONTRACTORS_ERROR', e);
      return {
        success: false,
        error: new AppError('外注先企業一覧の取得に失敗しました。', 'DATABASE_ERROR'),
      };
    }
  }
}