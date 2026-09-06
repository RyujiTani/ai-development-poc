import { Worker } from "../domain/Worker";

export interface IWorkerRepository {
  findByContractorId(contractorId: string): Promise<Worker[]>;
  deleteWorker(workerId: string): Promise<void>;
  getWorkerById(workerId: string): Promise<Worker | null>;
  saveWorker(worker: Worker): Promise<void>;
}