import { ContractorRepository } from '../repository/contractorRepository';
import { Result, AppError } from '@/lib/core/result';
import { logger } from '@/lib/logger';

export class DeleteContractorUseCase {
  constructor(private contractorRepository: ContractorRepository) {}

  async execute(contractorId: string): Promise<Result<void, AppError>> {
    try {
      const existing = await this.contractorRepository.findById(contractorId);
      if (!existing) {
        return {
          success: false,
          error: new AppError('指定された外注先企業が見つかりません。', 'NOT_FOUND'),
        };
      }

      await this.contractorRepository.delete(contractorId);
      logger.info('DELETE_CONTRACTOR_SUCCESS', { contractorId });
      return { success: true, value: undefined };
    } catch (e) {
      logger.error('DELETE_CONTRACTOR_ERROR', e, { contractorId });
      return {
        success: false,
        error: new AppError('外注先企業の削除に失敗しました。', 'DATABASE_ERROR'),
      };
    }
  }
}