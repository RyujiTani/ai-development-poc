import { Contractor } from '../domain/contractor';
import { ContractorRepository } from './contractorRepository';
import { dbManager } from '../../../lib/db/idb';

export class IndexedDBContractorRepository implements ContractorRepository {
  async findAll(): Promise<Contractor[]> {
    return dbManager.getAllContractors();
  }

  async findById(id: string): Promise<Contractor | null> {
    return dbManager.getContractorById(id);
  }

  async save(contractor: Contractor): Promise<void> {
    return dbManager.putContractor(contractor);
  }

  async delete(id: string): Promise<void> {
    return dbManager.deleteContractor(id);
  }
}