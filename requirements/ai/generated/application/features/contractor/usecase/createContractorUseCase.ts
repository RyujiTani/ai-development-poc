import { ContractorRepository } from '../repository/contractorRepository';
import { Contractor } from '../domain/types';
import { Result, AppError } from '@/lib/core/result';
import { logger } from '@/lib/logger';

export interface CreateContractorInput {
  name: string;
  status: 'ACTIVE' | 'INACTIVE';
}

export class CreateContractorUseCase {
  constructor(private contractorRepository: ContractorRepository) {}

  async execute(input: CreateContractorInput): Promise<Result<Contractor, AppError>> {
    try {
      if (!input.name || !input.name.trim()) {
        return {
          success: false,
          error: new AppError('企業名は必須入力です。', 'VALIDATION_ERROR'),
        };
      }

      const contractorId = `con-${crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2)}`;
      const now = new Date().toISOString();
      const contractor: Contractor = {
        contractor_id: contractorId,
        name: input.name.trim(),
        status: input.status,
        created_at: now,
        updated_at: now,
      };

      await this.contractorRepository.save(contractor);
      logger.info('CREATE_CONTRACTOR_SUCCESS', { contractorId });
      return { success: true, value: contractor };
    } catch (e) {
      logger.error('CREATE_CONTRACTOR_ERROR', e);
      return {
        success: false,
        error: new AppError('外注先企業の登録に失敗しました。', 'DATABASE_ERROR'),
      };
    }
  }
}