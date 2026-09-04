import { Result } from '../../../lib/error/appError';
import { logger } from '../../../lib/logger/logger';
import { Contractor } from '../domain/contractor';
import { ContractorRepository } from '../repository/contractorRepository';

export interface SaveContractorParams {
  contractorId?: string; // 編集時は必須
  name: string;
  status: 'ACTIVE' | 'INACTIVE';
}

export class SaveContractorUseCase {
  constructor(private contractorRepository: ContractorRepository) {}

  async execute(params: SaveContractorParams): Promise<Result<Contractor>> {
    try {
      const isEdit = !!params.contractorId;
      logger.info('save_contractor_attempt', {
        contractor_id: params.contractorId,
        is_edit: isEdit,
        name: params.name,
      });

      if (!params.name.trim()) {
        return {
          success: false,
          error: { code: 'INVALID_ARGUMENT', message: '企業名は必須入力です。' },
        };
      }

      const now = new Date().toISOString();
      let contractor: Contractor;

      if (isEdit && params.contractorId) {
        const existing = await this.contractorRepository.findById(params.contractorId);
        if (!existing) {
          return {
            success: false,
            error: { code: 'NOT_FOUND', message: '外注先企業が見つかりません。' },
          };
        }
        contractor = {
          ...existing,
          name: params.name,
          status: params.status,
          updated_at: now,
        };
      } else {
        contractor = {
          contractor_id: crypto.randomUUID(),
          name: params.name,
          status: 'ACTIVE',
          created_at: now,
          updated_at: now,
        };
      }

      await this.contractorRepository.save(contractor);
      logger.info('save_contractor_success', {
        contractor_id: contractor.contractor_id,
        is_edit: isEdit,
      });

      return { success: true, value: contractor };
    } catch (error) {
      logger.error('save_contractor_failed', error, { contractor_id: params.contractorId });
      return {
        success: false,
        error: { code: 'SYSTEM_ERROR', message: '外注先企業情報の保存に失敗しました。' },
      };
    }
  }
}