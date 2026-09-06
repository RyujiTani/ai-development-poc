import { Worker } from '../domain/types';

export interface WorkerRepository {
  findByContractorId(contractorId: string): Promise<Worker[]>;
  delete(workerId: string): Promise<void>;
  findById(workerId: string): Promise<Worker | null>;
  save(worker: Worker): Promise<void>;
}