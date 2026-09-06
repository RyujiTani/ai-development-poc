import { initDB } from '@/lib/db';
import { Result, AppError } from '@/lib/core/result';
import { logger } from '@/lib/logger';
import { AttendanceRecord } from '../domain/types';

export interface AttendanceHistoryItem extends AttendanceRecord {
  worker_name: string;
  contractor_name: string;
}

export interface GetAttendanceHistoryInput {
  date?: string; // YYYY-MM-DD
  contractorId?: string; // 指定がなければ全社
}

export class GetAttendanceHistoryUseCase {
  async execute(input: GetAttendanceHistoryInput): Promise<Result<AttendanceHistoryItem[], AppError>> {
    try {
      const db = await initDB();

      // 各ストアから全データを取得してインメモリで結合・フィルタリング
      const recordsTx = db.transaction('attendance_records', 'readonly');
      const records = (await recordsTx.objectStore('attendance_records').getAll()) as AttendanceRecord[];
      await recordsTx.done;

      const workersTx = db.transaction('workers', 'readonly');
      const workers = await workersTx.objectStore('workers').getAll();
      await workersTx.done;

      const contractorsTx = db.transaction('contractors', 'readonly');
      const contractors = await contractorsTx.objectStore('contractors').getAll();
      await contractorsTx.done;

      // 1. フィルタリング
      let filteredRecords = records;

      if (input.date) {
        filteredRecords = filteredRecords.filter((rec) => {
          // clocked_at は ISO8601。日付部分 YYYY-MM-DD が一致するか確認
          const recDate = rec.clocked_at.substring(0, 10);
          return recDate === input.date;
        });
      }

      if (input.contractorId) {
        filteredRecords = filteredRecords.filter((rec) => rec.contractor_id === input.contractorId);
      }

      // 2. 結合
      const resultItems: AttendanceHistoryItem[] = filteredRecords.map((rec) => {
        const worker = workers.find((w: any) => w.worker_id === rec.worker_id);
        const contractor = contractors.find((c: any) => c.contractor_id === rec.contractor_id);

        return {
          ...rec,
          worker_name: worker ? worker.name : '不明な作業員',
          contractor_name: contractor ? contractor.name : '不明な外注先',
        };
      });

      // 打刻時間の降順でソート
      resultItems.sort((a, b) => new Date(b.clocked_at).getTime() - new Date(a.clocked_at).getTime());

      return { success: true, value: resultItems };
    } catch (e) {
      logger.error('GET_ATTENDANCE_HISTORY_ERROR', e);
      return {
        success: false,
        error: new AppError('打刻履歴の取得に失敗しました。', 'DATABASE_ERROR'),
      };
    }
  }
}