import { getDB } from "@/lib/db/indexedDB";
import { Result } from "@/lib/error/AppError";
import { logger } from "@/lib/logger/logger";
import { Worker } from "@/features/worker/domain/Worker";
import { AttendanceRecord } from "@/features/attendance/domain/AttendanceRecord";

export interface LaborSummaryItem {
  worker_id: string;
  worker_name: string;
  contractor_name: string;
  period: string; // YYYY-MM-DD or YYYY-MM
  total_hours: number;
}

export interface GetLaborSummaryInput {
  start_date: string; // YYYY-MM-DD
  end_date: string;   // YYYY-MM-DD
  unit: "daily" | "monthly";
}

export async function getLaborSummaryUseCase(
  input: GetLaborSummaryInput
): Promise<Result<LaborSummaryItem[]>> {
  logger.info("GET_LABOR_SUMMARY_ATTEMPT", {
    start_date: input.start_date,
    end_date: input.end_date,
    unit: input.unit,
  });

  try {
    const db = await getDB();
    
    // データ取得
    const txWorkers = db.transaction("workers", "readonly");
    const workers = (await txWorkers.store.getAll()) as Worker[];
    await txWorkers.done;

    const txContractors = db.transaction("contractors", "readonly");
    const contractors = await txContractors.store.getAll();
    await txContractors.done;

    const txAttendance = db.transaction("attendance_records", "readonly");
    const records = (await txAttendance.store.getAll()) as AttendanceRecord[];
    await txAttendance.done;

    const workerMap = new Map(workers.map((w) => [w.worker_id, w]));
    const contractorMap = new Map(contractors.map((c) => [c.contractor_id, c]));

    const jstOffset = 9 * 60 * 60 * 1000;

    // 作業員ごとに打刻レコードを整理して、日次の労働時間を計算する
    // worker_id -> date (YYYY-MM-DD) -> hours
    const dailyHoursMap = new Map<string, Map<string, number>>();

    // まず作業員ごとにレコードを分類
    const workerRecordsMap = new Map<string, AttendanceRecord[]>();
    for (const record of records) {
      if (!workerRecordsMap.has(record.worker_id)) {
        workerRecordsMap.set(record.worker_id, []);
      }
      workerRecordsMap.get(record.worker_id)!.push(record);
    }

    for (const [workerId, wRecords] of workerRecordsMap.entries()) {
      // 時系列ソート
      wRecords.sort((a, b) => new Date(a.clocked_at).getTime() - new Date(b.clocked_at).getTime());

      // 各日のペアを計算する
      let activeIn: AttendanceRecord | null = null;
      const hoursMap = new Map<string, number>();

      for (const record of wRecords) {
        if (record.punch_type === "CLOCK_IN") {
          activeIn = record;
        } else if (record.punch_type === "CLOCK_OUT" && activeIn) {
          const inTime = new Date(activeIn.clocked_at).getTime();
          const outTime = new Date(record.clocked_at).getTime();
          const diffMs = outTime - inTime;
          if (diffMs > 0) {
            const diffHours = diffMs / (1000 * 60 * 60);
            
            // 出勤打刻のJST日付をキーとする
            const inJstDate = new Date(inTime + jstOffset).toISOString().split("T")[0];
            const current = hoursMap.get(inJstDate) || 0;
            hoursMap.set(inJstDate, current + diffHours);
          }
          activeIn = null; // ペア成立でリセット
        }
      }
      dailyHoursMap.set(workerId, hoursMap);
    }

    // フィルタリングと集計
    const start = new Date(input.start_date).getTime();
    const end = new Date(input.end_date).getTime() + 24 * 60 * 60 * 1000 - 1; // 終了日の23:59:59.999まで

    const summaryMap = new Map<string, number>(); // key: `${workerId}_${period}` -> hours

    for (const [workerId, hoursMap] of dailyHoursMap.entries()) {
      for (const [dateStr, hours] of hoursMap.entries()) {
        const dateVal = new Date(dateStr).getTime();
        // 期間内チェック
        if (dateVal >= start && dateVal <= end) {
          let periodKey = dateStr;
          if (input.unit === "monthly") {
            periodKey = dateStr.slice(0, 7); // YYYY-MM
          }
          const key = `${workerId}_${periodKey}`;
          const current = summaryMap.get(key) || 0;
          summaryMap.set(key, current + hours);
        }
      }
    }

    // 結果のオブジェクト配列化
    const result: LaborSummaryItem[] = [];
    for (const [key, totalHours] of summaryMap.entries()) {
      const [workerId, period] = key.split("_");
      const worker = workerMap.get(workerId);
      if (!worker) continue;

      const contractor = contractorMap.get(worker.contractor_id);
      const contractorName = contractor ? contractor.name : "不明な外注先";

      result.push({
        worker_id: workerId,
        worker_name: worker.name,
        contractor_name: contractorName,
        period,
        total_hours: Math.round(totalHours * 100) / 100, // 小数点以下2桁
      });
    }

    // ソート: 期間（昇順）、外注先（昇順）、作業員名（昇順）
    result.sort((a, b) => {
      if (a.period !== b.period) {
        return a.period.localeCompare(b.period);
      }
      if (a.contractor_name !== b.contractor_name) {
        return a.contractor_name.localeCompare(b.contractor_name);
      }
      return a.worker_name.localeCompare(b.worker_name);
    });

    return {
      success: true,
      value: result,
    };
  } catch (error) {
    logger.error("GET_LABOR_SUMMARY_SYSTEM_ERROR", { error: String(error) });
    return {
      success: false,
      error: { code: "SYSTEM_ERROR", message: "労働時間集計の取得に失敗しました。" },
    };
  }
}