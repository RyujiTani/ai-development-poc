import { Worker } from '../domain/worker';

export interface WorkerRepository {
  getByContractorId(contractorId: string): Promise<Worker[]>;
}