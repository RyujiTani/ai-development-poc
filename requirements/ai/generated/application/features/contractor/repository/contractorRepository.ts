import { Contractor } from "../domain/Contractor";

export interface IContractorRepository {
  getAllContractors(): Promise<Contractor[]>;
  getContractorById(id: string): Promise<Contractor | null>;
  saveContractor(contractor: Contractor): Promise<void>;
  deleteContractor(id: string): Promise<void>;
  hasWorkers(contractorId: string): Promise<boolean>;
}