import { Result } from '../../../lib/error/appError';
import { Worker } from '../domain/worker';
import { WorkerRepository } from '../repository/workerRepository';
import { logger } from '../../../lib/logger/logger';

export interface SaveWorkerParams {
  workerId?: string;
  contractorId: string;
  name: string;
  contact?: string;
  qualifications: string[];
  trainings: Array<{ code: string; taken_at: string }>;
}

export class SaveWorkerUseCase {
  constructor(private workerRepository: WorkerRepository) {}

  async execute(params: SaveWorkerParams): Promise<Result<Worker>> {
    try {
      const isEdit = !!params.workerId;
      logger.info('save_worker_attempt', {
        worker_id: params.workerId,
        is_edit: isEdit,
        contractor_id: params.contractorId,
      });

      if (!params.name.trim()) {
        return {
          success: false,
          error: { code: 'INVALID_ARGUMENT', message: '氏名は必須入力です。' },
        };
      }

      if (!params.contact || !params.contact.trim()) {
        return {
          success: false,
          error: { code: 'INVALID_ARGUMENT', message: '連絡先は必須入力です。' },
        };
      }

      const now = new Date().toISOString();
      let worker: Worker;

      if (isEdit && params.workerId) {
        const existing = await this.workerRepository.findById(params.workerId);
        if (!existing) {
          return {
            success: false,
            error: { code: 'NOT_FOUND', message: '作業員が見つかりません。' },
          };
        }
        worker = {
          ...existing,
          name: params.name,
          contact: params.contact,
          qualifications: params.qualifications,
          trainings: params.trainings,
          updated_at: now,
        };
      } else {
        worker = {
          worker_id: crypto.randomUUID(),
          contractor_id: params.contractorId,
          name: params.name,
          contact: params.contact,
          qualifications: params.qualifications,
          trainings: params.trainings,
          status: 'ACTIVE',
          created_at: now,
          updated_at: now,
        };
      }

      await this.workerRepository.save(worker);
      logger.info('save_worker_success', { worker_id: worker.worker_id, is_edit: isEdit });

      return { success: true, value: worker };
    } catch (error) {
      logger.error('save_worker_failed', error, { worker_id: params.workerId });
      return {
        success: false,
        error: { code: 'SYSTEM_ERROR', message: '作業員情報の保存に失敗しました。' },
      };
    }
  }
}