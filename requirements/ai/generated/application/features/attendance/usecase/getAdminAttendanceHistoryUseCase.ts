import { getDB } from "@/lib/db/indexedDB";
import { Result } from "@/lib/error/AppError";
import { logger } from "@/lib/logger/logger";
import { IndexedDBAttendanceRepository } from "../repository/indexedDBAttendanceRepository";
import { Worker } from "@/features/worker/domain/Worker";

export interface AdminAttendanceHistoryItem {
  attendance_id: string;
  worker_id: string;
  worker_name: string;
  contractor_id: string;
  contractor_name: string;
  punch_type: "CLOCK_IN" | "CLOCK_OUT";
  clocked_at: string;
  photo_object_id: string;
}

export interface GetAdminAttendanceHistoryInput {
  date?: string; // YYYY-MM-DD
  contractorId?: string;
}

export async function getAdminAttendanceHistoryUseCase(
  input: GetAdminAttendanceHistoryInput
): Promise<Result<{ punches: AdminAttendanceHistoryItem[]; total_count: number }>> {
  logger.info("GET_ADMIN_ATTENDANCE_HISTORY_ATTEMPT", {
    date: input.date,
    contractorId: input.contractorId,
  });

  try {
    const repo = new IndexedDBAttendanceRepository();
    const records = await repo.getAllRecords();

    const db = await getDB();
    
    // workers取得
    const txWorkers = db.transaction("workers", "readonly");
    const workers = (await txWorkers.store.getAll()) as Worker[];
    await txWorkers.done;

    // contractors取得
    const txContractors = db.transaction("contractors", "readonly");
    const contractors = await txContractors.store.getAll();
    await txContractors.done;

    const workerMap = new Map(workers.map(w => [w.worker_id, w]));
    const contractorMap = new Map(contractors.map(c => [c.contractor_id, c]));

    let items: AdminAttendanceHistoryItem[] = records.map(r => {
      const worker = workerMap.get(r.worker_id);
      const contractor = contractorMap.get(r.contractor_id);
      return {
        attendance_id: r.attendance_id,
        worker_id: r.worker_id,
        worker_name: worker ? worker.name : `作業員ID: ${r.worker_id}`,
        contractor_id: r.contractor_id,
        contractor_name: contractor ? contractor.name : `外注先ID: ${r.contractor_id}`,
        punch_type: r.punch_type,
        clocked_at: r.clocked_at,
        photo_object_id: r.photo_object_id,
      };
    });

    // フィルタリング
    if (input.date) {
      const targetDate = input.date;
      items = items.filter(item => {
        const jstOffset = 9 * 60 * 60 * 1000;
        const itemDateStr = new Date(new Date(item.clocked_at).getTime() + jstOffset).toISOString().split("T")[0];
        return itemDateStr === targetDate;
      });
    }

    if (input.contractorId) {
      items = items.filter(item => item.contractor_id === input.contractorId);
    }

    // clocked_at の降順でソート
    items.sort((a, b) => new Date(b.clocked_at).getTime() - new Date(a.clocked_at).getTime());

    return {
      success: true,
      value: {
        punches: items,
        total_count: items.length
      }
    };
  } catch (error) {
    logger.error("GET_ADMIN_ATTENDANCE_HISTORY_SYSTEM_ERROR", { error: String(error) });
    return {
      success: false,
      error: { code: "SYSTEM_ERROR", message: "打刻履歴の取得に失敗しました。" }
    };
  }
}