import { initDB } from '@/lib/db';
import { Result, AppError } from '@/lib/core/result';
import { logger } from '@/lib/logger';

export interface DashboardAlert {
  id: string;
  type: string;
  message: string;
  occurred_at: string;
}

export interface DashboardData {
  summary: {
    total_workers: number;
    active_workers: number;
    total_contractors: number;
  };
  alerts: DashboardAlert[];
}

export class GetDashboardDataUseCase {
  async execute(): Promise<Result<DashboardData, AppError>> {
    try {
      const db = await initDB();

      // 各ストアから全データを取得
      const workersTx = db.transaction('workers', 'readonly');
      const workers = await workersTx.objectStore('workers').getAll();
      await workersTx.done;

      const contractorsTx = db.transaction('contractors', 'readonly');
      const contractors = await contractorsTx.objectStore('contractors').getAll();
      await contractorsTx.done;

      const attendanceTx = db.transaction('attendance_records', 'readonly');
      const attendanceRecords = await attendanceTx.objectStore('attendance_records').getAll();
      await attendanceTx.done;

      // 1. 本日の稼働人数サマリー計算
      // 作業員ごとの最新打刻を追跡
      const workerLatestPunch: Record<string, { punch_type: string; clocked_at: string }> = {};

      for (const record of attendanceRecords) {
        const workerId = record.worker_id;
        const current = workerLatestPunch[workerId];
        if (!current || new Date(record.clocked_at) > new Date(current.clocked_at)) {
          workerLatestPunch[workerId] = {
            punch_type: record.punch_type,
            clocked_at: record.clocked_at,
          };
        }
      }

      // 稼働中人数: 最新打刻が CLOCK_IN の作業員
      let activeCount = 0;
      for (const workerId in workerLatestPunch) {
        if (workerLatestPunch[workerId].punch_type === 'CLOCK_IN') {
          activeCount++;
        }
      }

      // 2. アラート生成
      const alerts: DashboardAlert[] = [];

      // アラート例1: 出勤打刻から12時間以上経過（打刻漏れの疑い）
      const now = new Date();
      for (const workerId in workerLatestPunch) {
        const latest = workerLatestPunch[workerId];
        if (latest.punch_type === 'CLOCK_IN') {
          const punchTime = new Date(latest.clocked_at);
          const diffMs = now.getTime() - punchTime.getTime();
          const diffHours = diffMs / (1000 * 60 * 60);

          if (diffHours >= 12) {
            const worker = workers.find((w: any) => w.worker_id === workerId);
            const workerName = worker ? worker.name : '不明な作業員';
            alerts.push({
              id: `alert-punch-${workerId}`,
              type: 'PUNCH_MISSING',
              message: `${workerName}さんの出勤打刻から12時間以上が経過しています（退勤打刻漏れの疑い）。`,
              occurred_at: latest.clocked_at,
            });
          }
        }
      }

      // アラート例2: 安全衛生教育講習の受講履歴がない作業員
      for (const worker of workers) {
        if (worker.status === 'ACTIVE' && (!worker.trainings || worker.trainings.length === 0)) {
          alerts.push({
            id: `alert-training-${worker.worker_id}`,
            type: 'TRAINING_REQUIRED',
            message: `${worker.name}さんは安全衛生教育講習の受講履歴がありません。`,
            occurred_at: worker.created_at,
          });
        }
      }

      // アラートを発生日時の新しい順（降順）にソート
      alerts.sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime());

      const data: DashboardData = {
        summary: {
          total_workers: workers.filter((w: any) => w.status === 'ACTIVE').length,
          active_workers: activeCount,
          total_contractors: contractors.filter((c: any) => c.status === 'ACTIVE').length,
        },
        alerts: alerts,
      };

      return { success: true, value: data };
    } catch (e) {
      logger.error('GET_DASHBOARD_DATA_ERROR', e);
      return {
        success: false,
        error: new AppError('ダッシュボードデータの取得に失敗しました。', 'DATABASE_ERROR'),
      };
    }
  }
}