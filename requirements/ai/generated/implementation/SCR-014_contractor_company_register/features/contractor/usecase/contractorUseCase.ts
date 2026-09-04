import { Contractor, Status } from '../domain/contractor';
import { ContractorRepository } from '../repository/contractorRepository';
import { Result } from '@/lib/error/appError';

export class ContractorUseCase {
  constructor(private contractorRepository: ContractorRepository) {}

  async getContractors(): Promise<Result<Contractor[]>> {
    try {
      const list = await this.contractorRepository.findAll();
      list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      return { success: true, value: list };
    } catch (e: any) {
      return {
        success: false,
        error: { code: 'FETCH_ERROR', message: e.message || 'データ取得に失敗しました。' }
      };
    }
  }

  async createContractor(name: string): Promise<Result<Contractor>> {
    if (!name || name.trim() === '') {
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: '企業名は必須入力です。' }
      };
    }

    try {
      const newContractor: Contractor = {
        contractor_id: crypto.randomUUID(),
        name: name.trim(),
        status: 'ACTIVE',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      const saved = await this.contractorRepository.save(newContractor);
      return { success: true, value: saved };
    } catch (e: any) {
      return {
        success: false,
        error: { code: 'SAVE_ERROR', message: e.message || '登録に失敗しました。' }
      };
    }
  }

  async updateContractor(
    id: string,
    name: string,
    status: Extract<Status, 'ACTIVE' | 'INACTIVE'>
  ): Promise<Result<Contractor>> {
    if (!name || name.trim() === '') {
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: '企業名は必須入力です。' }
      };
    }

    try {
      const existing = await this.contractorRepository.findById(id);
      if (!existing) {
        return {
          success: false,
          error: { code: 'NOT_FOUND', message: '対象の企業が見つかりません。' }
        };
      }

      const updated: Contractor = {
        ...existing,
        name: name.trim(),
        status,
        updated_at: new Date().toISOString()
      };
      const saved = await this.contractorRepository.save(updated);
      return { success: true, value: saved };
    } catch (e: any) {
      return {
        success: false,
        error: { code: 'UPDATE_ERROR', message: e.message || '更新に失敗しました。' }
      };
    }
  }

  async deleteContractor(id: string): Promise<Result<void>> {
    try {
      const existing = await this.contractorRepository.findById(id);
      if (!existing) {
        return {
          success: false,
          error: { code: 'NOT_FOUND', message: '対象の企業が見つかりません。' }
        };
      }
      await this.contractorRepository.delete(id);
      return { success: true, value: undefined };
    } catch (e: any) {
      return {
        success: false,
        error: { code: 'DELETE_ERROR', message: e.message || '削除に失敗しました。' }
      };
    }
  }
}