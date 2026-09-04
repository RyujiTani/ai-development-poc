import { Result } from '../../../lib/error/appError';
import { ContractorRepository } from '../repository/contractorRepository';
import { logger } from '../../../lib/logger/logger';

export class DeleteContractorUseCase {
  constructor(private contractorRepository: ContractorRepository) {}

  async execute(contractorId: string): Promise<Result<void>> {
    try {
      logger.info('delete_contractor_attempt', { contractor_id: contractorId });
      const contractor = await this.contractorRepository.findById(contractorId);
      if (!contractor) {
        logger.warn('delete_contractor_not_found', { contractor_id: contractorId });
        return {
          success: false,
          error: { code: 'NOT_FOUND', message: '外注先企業が見つかりません。' },
        };
      }

      await this.contractorRepository.delete(contractorId);
      logger.info('delete_contractor_success', { contractor_id: contractorId });
      return { success: true, value: undefined };
    } catch (error) {
      logger.error('delete_contractor_failed', error, { contractor_id: contractorId });
      return {
        success: false,
        error: { code: 'SYSTEM_ERROR', message: '外注先企業の削除に失敗しました。' },
      };
    }
  }
}