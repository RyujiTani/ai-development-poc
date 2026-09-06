import { initDB } from '@/lib/db';
import { Result, AppError } from '@/lib/core/result';
import { logger } from '@/lib/logger';
import { AttendanceRecord } from '@/features/attendance/domain/types';

export interface LaborSummaryItem {
  worker_id: string;
  worker_name: string;
  contractor_id: string;
  contractor_name: string;
  period: string; // YYYY-MM-DD または YYYY-MM
  working_hours: number;
}

export interface GetLaborSummaryInput {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  unit: 'daily' | 'monthly';
}

export class GetLaborSummaryUseCase {
  async execute(input: GetLaborSummaryInput): Promise<Result<LaborSummaryItem[], AppError>> {
    try {
      if (!input.startDate) {
        return {
          success: false,
          error: new AppError('開始日を入力してください', 'VALIDATION_ERROR'),
        };
      }
      if (!input.endDate) {
        return {
          success: false,
          error: new AppError('終了日を入力してください', 'VALIDATION_ERROR'),
        };
      }
      if (new Date(input.startDate) > new Date(input.endDate)) {
        return {
          success: false,
          error: new AppError('終了日は開始日以降の日付を入力してください', 'VALIDATION_ERROR'),
        };
      }

      const db = await initDB();

      // 各ストアから全データを取得
      const recordsTx = db.transaction('attendance_records', 'readonly');
      const records = (await recordsTx.objectStore('attendance_records').getAll()) as AttendanceRecord[];
      await recordsTx.done;

      const workersTx = db.transaction('workers', 'readonly');
      const workers = await workersTx.objectStore('workers').getAll();
      await workersTx.done;

      const contractorsTx = db.transaction('contractors', 'readonly');
      const contractors = await contractorsTx.objectStore('contractors').getAll();
      await contractorsTx.done;

      // 日付フィルタリング範囲を設定
      const startDateTime = new Date(`${input.startDate}T00:00:00`).getTime();
      const endDateTime = new Date(`${input.endDate}T23:59:59.999`).getTime();

      const inRangeRecords = records.filter((rec) => {
        const time = new Date(rec.clocked_at).getTime();
        return time >= startDateTime && time <= endDateTime;
      });

      // 作業員ごとに打刻レコードをグループ化してソート
      const workerRecords: Record<string, AttendanceRecord[]> = {};
      for (const rec of inRangeRecords) {
        if (!workerRecords[rec.worker_id]) {
          workerRecords[rec.worker_id] = [];
        }
        workerRecords[rec.worker_id].push(rec);
      }

      const summaryList: LaborSummaryItem[] = [];

      for (const workerId in workerRecords) {
        const sortedRecs = workerRecords[workerId].sort(
          (a, b) => new Date(a.clocked_at).getTime() - new Date(b.clocked_at).getTime()
        );

        const worker = workers.find((w: any) => w.worker_id === workerId);
        const contractor = contractors.find((c: any) => c.contractor_id === worker?.contractor_id);
        const workerName = worker ? worker.name : '不明な作業員';
        const contractorName = contractor ? contractor.name : '不明な外注先';
        const contractorId = worker ? worker.contractor_id : '';

        // 日付または月ごとの累積ミリ秒数
        const periodWorkingMap: Record<string, number> = {};
        let lastClockInTime: number | null = null;

        for (const rec of sortedRecs) {
          if (rec.punch_type === 'CLOCK_IN') {
            lastClockInTime = new Date(rec.clocked_at).getTime();
          } else if (rec.punch_type === 'CLOCK_OUT') {
            if (lastClockInTime !== null) {
              const outTime = new Date(rec.clocked_at).getTime();
              const diffMs = outTime - lastClockInTime;
              if (diffMs > 0) {
                const clockInDate = new Date(lastClockInTime);
                const year = clockInDate.getFullYear();
                const month = String(clockInDate.getMonth() + 1).padStart(2, '0');
                const day = String(clockInDate.getDate()).padStart(2, '0');

                const periodKey = input.unit === 'daily' ? `${year}-${month}-${day}` : `${year}-${month}`;
                periodWorkingMap[periodKey] = (periodWorkingMap[periodKey] || 0) + diffMs;
              }
              lastClockInTime = null;
            }
          }
        }

        // ミリ秒を時間に換算しリストに追加
        for (const period in periodWorkingMap) {
          const hours = periodWorkingMap[period] / (1000 * 60 * 60);
          summaryList.push({
            worker_id: workerId,
            worker_name: workerName,
            contractor_id: contractorId,
            contractor_name: contractorName,
            period: period,
            working_hours: Math.round(hours * 100) / 100, // 小数点以下2桁に丸める
          });
        }
      }

      // 期間の降順、作業員名の昇順でソート
      summaryList.sort((a, b) => {
        if (b.period !== a.period) {
          return b.period.localeCompare(a.period);
        }
        return a.worker_name.localeCompare(b.worker_name);
      });

      return { success: true, value: summaryList };
    } catch (e) {
      logger.error('GET_LABOR_SUMMARY_ERROR', e);
      return {
        success: false,
        error: new AppError('労働時間集計の計算に失敗しました。', 'DATABASE_ERROR'),
      };
    }
  }
}