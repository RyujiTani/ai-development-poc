import { Contractor } from '../domain/contractor';

export interface ContractorRepository {
  findAll(): Promise<Contractor[]>;
  findById(id: string): Promise<Contractor | null>;
  save(contractor: Contractor): Promise<void>;
  delete(id: string): Promise<void>;
}