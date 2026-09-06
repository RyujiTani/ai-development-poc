import { ContractorRepository } from '../repository/contractorRepository';
import { Contractor } from '../domain/types';
import { Result, AppError } from '@/lib/core/result';
import { logger } from '@/lib/logger';

export interface UpdateContractorInput {
  contractorId: string;
  name: string;
  status: 'ACTIVE' | 'INACTIVE';
}

export class UpdateContractorUseCase {
  constructor(private contractorRepository: ContractorRepository) {}

  async execute(input: UpdateContractorInput): Promise<Result<Contractor, AppError>> {
    try {
      if (!input.name || !input.name.trim()) {
        return {
          success: false,
          error: new AppError('企業名は必須入力です。', 'VALIDATION_ERROR'),
        };
      }

      const existing = await this.contractorRepository.findById(input.contractorId);
      if (!existing) {
        return {
          success: false,
          error: new AppError('指定された外注先企業が見つかりません。', 'NOT_FOUND'),
        };
      }

      const updatedContractor: Contractor = {
        ...existing,
        name: input.name.trim(),
        status: input.status,
        updated_at: new Date().toISOString(),
      };

      await this.contractorRepository.save(updatedContractor);
      logger.info('UPDATE_CONTRACTOR_SUCCESS', { contractorId: input.contractorId });
      return { success: true, value: updatedContractor };
    } catch (e) {
      logger.error('UPDATE_CONTRACTOR_ERROR', e, { contractorId: input.contractorId });
      return {
        success: false,
        error: new AppError('外注先企業の更新に失敗しました。', 'DATABASE_ERROR'),
      };
    }
  }
}