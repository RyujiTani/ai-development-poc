import { Worker } from '@/features/worker/domain/types';
import { IWorkerRepository } from '../repository/workerRepository';

export class WorkerUseCase {
  constructor(private workerRepository: IWorkerRepository) {}

  async getWorkers(contractorId: string): Promise<Worker[]> {
    return this.workerRepository.getWorkersByContractor(contractorId);
  }

  async deleteWorker(workerId: string): Promise<void> {
    return this.workerRepository.deleteWorker(workerId);
  }
}