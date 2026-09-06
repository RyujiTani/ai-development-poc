import { Contractor } from '../domain/types';

export interface ContractorRepository {
  getAll(): Promise<Contractor[]>;
  save(contractor: Contractor): Promise<void>;
  delete(contractorId: string): Promise<void>;
  findById(contractorId: string): Promise<Contractor | null>;
}