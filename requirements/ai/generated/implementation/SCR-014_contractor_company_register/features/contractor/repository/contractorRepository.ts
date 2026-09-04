import { Contractor } from '../domain/contractor';

export interface ContractorRepository {
  findAll(): Promise<Contractor[]>;
  findById(id: string): Promise<Contractor | null>;
  save(contractor: Contractor): Promise<Contractor>;
  delete(id: string): Promise<void>;
}