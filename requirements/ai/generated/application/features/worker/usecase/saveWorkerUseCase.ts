import { Result } from "@/lib/error/AppError";
import { logger } from "@/lib/logger/logger";
import { Worker } from "../domain/Worker";
import { IndexedDBWorkerRepository } from "../repository/indexedDBWorkerRepository";
import { recordAuditLog } from "@/lib/db/auditLog";

export interface SaveWorkerInput {
  workerId?: string;
  contractorId: string;
  name: string;
  contact?: string;
  qualifications: string[];
  trainings: Array<{ code: string; taken_at: string }>;
  status: "ACTIVE" | "RETIRED";
  userId: string;
}

export async function saveWorkerUseCase(input: SaveWorkerInput): Promise<Result<Worker>> {
  const isEdit = !!input.workerId;
  logger.info(isEdit ? "UPDATE_WORKER_ATTEMPT" : "CREATE_WORKER_ATTEMPT", {
    workerId: input.workerId,
    name: input.name,
  });

  try {
    const repo = new IndexedDBWorkerRepository();
    const now = new Date().toISOString();

    let existingWorker: Worker | null = null;
    if (isEdit && input.workerId) {
      existingWorker = await repo.getWorkerById(input.workerId);
    }

    const workerId = input.workerId || crypto.randomUUID();
    const createdAt = existingWorker ? existingWorker.created_at : now;

    const worker: Worker = {
      worker_id: workerId,
      contractor_id: input.contractorId,
      name: input.name,
      contact: input.contact || "",
      qualifications: input.qualifications,
      trainings: input.trainings,
      status: input.status,
      created_at: createdAt,
      updated_at: now,
    };

    await repo.saveWorker(worker);

    await recordAuditLog({
      actor_user_id: input.userId,
      actor_role: "CONTRACTOR_MANAGER",
      action: isEdit ? "UPDATE_WORKER" : "CREATE_WORKER",
      target_type: "worker",
      target_id: workerId,
      detail: {
        name: input.name,
      },
    });

    logger.info(isEdit ? "UPDATE_WORKER_SUCCESS" : "CREATE_WORKER_SUCCESS", { workerId });

    return {
      success: true,
      value: worker,
    };
  } catch (error) {
    logger.error("SAVE_WORKER_SYSTEM_ERROR", { error: String(error) });
    return {
      success: false,
      error: { code: "SYSTEM_ERROR", message: "作業員の保存に失敗しました。" },
    };
  }
}