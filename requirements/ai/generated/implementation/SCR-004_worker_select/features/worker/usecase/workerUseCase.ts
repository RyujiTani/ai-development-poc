import { WorkerRepository } from '../repository/workerRepository';
import { Worker } from '../domain/worker';

export class WorkerUseCase {
  constructor(private workerRepository: WorkerRepository) {}

  async getWorkersByContractor(contractorId: string): Promise<Worker[]> {
    return this.workerRepository.getByContractorId(contractorId);
  }
}