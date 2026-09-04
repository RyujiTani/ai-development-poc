import { Contractor, Status } from '../domain/contractor';
import { ContractorRepository } from '../repository/contractorRepository';

export class ContractorUsecase {
  constructor(private repository: ContractorRepository) {}

  async getContractors(): Promise<Contractor[]> {
    return this.repository.findAll();
  }

  async createContractor(name: string): Promise<Contractor> {
    const trimmedName = name ? name.trim() : '';
    if (!trimmedName) {
      throw new Error('企業名は必須入力です');
    }
    const newContractor: Contractor = {
      contractor_id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2),
      name: trimmedName,
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    await this.repository.save(newContractor);
    return newContractor;
  }

  async updateContractor(id: string, name: string, status: Status): Promise<Contractor> {
    const trimmedName = name ? name.trim() : '';
    if (!trimmedName) {
      throw new Error('企業名は必須入力です');
    }
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new Error('対象の外注先企業が見つかりません');
    }
    const updated: Contractor = {
      ...existing,
      name: trimmedName,
      status,
      updated_at: new Date().toISOString(),
    };
    await this.repository.save(updated);
    return updated;
  }

  async deleteContractor(id: string): Promise<void> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new Error('対象の外注先企業が見つかりません');
    }
    await this.repository.delete(id);
  }
}