import { WorkerRepository } from '../repository/workerRepository';
import { Worker } from '../domain/types';
import { Result, AppError } from '@/lib/core/result';
import { logger } from '@/lib/logger';

export interface CreateWorkerInput {
  contractorId: string;
  name: string;
  contact?: string;
  qualifications: string[];
  trainings: Array<{ code: string; taken_at: string }>;
}

export class CreateWorkerUseCase {
  constructor(private workerRepository: WorkerRepository) {}

  async execute(input: CreateWorkerInput): Promise<Result<Worker, AppError>> {
    try {
      const workerId = `wrk-${crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2)}`;
      const now = new Date().toISOString();
      const worker: Worker = {
        worker_id: workerId,
        contractor_id: input.contractorId,
        name: input.name,
        contact: input.contact,
        qualifications: input.qualifications,
        trainings: input.trainings,
        status: 'ACTIVE',
        created_at: now,
        updated_at: now,
      };

      await this.workerRepository.save(worker);
      logger.info('CREATE_WORKER_SUCCESS', { workerId });
      return { success: true, value: worker };
    } catch (e) {
      logger.error('CREATE_WORKER_ERROR', e);
      return {
        success: false,
        error: new AppError('作業員の登録に失敗しました。', 'DATABASE_ERROR'),
      };
    }
  }
}