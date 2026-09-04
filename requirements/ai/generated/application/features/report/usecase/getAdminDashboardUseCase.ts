import { Result } from '../../../lib/error/appError';
import { logger } from '../../../lib/logger/logger';
import { AttendanceRepository, AttendanceRecord } from '../../attendance/repository/attendanceRepository';
import { WorkerRepository } from '../../worker/repository/workerRepository';
import { ContractorRepository } from '../../contractor/repository/contractorRepository';

export interface DashboardAlert {
  id: string;
  type: 'PUNCH_MISSING' | 'QUALIFICATION_ALERT' | 'SYSTEM_ALERT';
  message: string;
  severity: 'high' | 'medium' | 'info';
  workerId?: string;
  workerName?: string;
  contractorName?: string;
  occurredAt: string;
}

export interface DashboardSummary {
  activeContractorsCount: number;
  totalWorkersCount: number;
  todayClockedInCount: number;
  todayClockedOutCount: number;
  alerts: DashboardAlert[];
}

export class GetAdminDashboardUseCase {
  constructor(
    private attendanceRepository: AttendanceRepository,
    private workerRepository: WorkerRepository,
    private contractorRepository: ContractorRepository
  ) {}

  async execute(): Promise<Result<DashboardSummary>> {
    try {
      logger.info('get_admin_dashboard_attempt');

      // 1. 各種マスタデータの取得
      const contractors = await this.contractorRepository.findAll();
      const activeContractors = contractors.filter((c) => c.status === 'ACTIVE');

      const workers = await this.workerRepository.findAll();
      const activeWorkers = workers.filter((w) => w.status === 'ACTIVE');

      const allRecords = await this.attendanceRepository.findAllRecords();

      // 2. 本日日付の判定 (YYYY-MM-DD)
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      const todayStr = `${yyyy}-${mm}-${dd}`;

      // 本日の打刻データのみ抽出
      const todayRecords = allRecords.filter(
        (r) => r.clocked_at.slice(0, 10) === todayStr
      );

      // 本日出勤(CLOCK_IN)および退勤(CLOCK_OUT)したユニークな作業員数を集計
      const clockedInWorkerIds = new Set(
        todayRecords.filter((r) => r.punch_type === 'CLOCK_IN').map((r) => r.worker_id)
      );
      const clockedOutWorkerIds = new Set(
        todayRecords.filter((r) => r.punch_type === 'CLOCK_OUT').map((r) => r.worker_id)
      );

      // 3. アラートの抽出処理
      const alerts: DashboardAlert[] = [];

      // 作業員ごとの本日の最新打刻を特定
      const workerTodayLatest: Record<string, AttendanceRecord> = {};
      for (const record of todayRecords) {
        const currentLatest = workerTodayLatest[record.worker_id];
        if (
          !currentLatest ||
          new Date(record.clocked_at).getTime() > new Date(currentLatest.clocked_at).getTime()
        ) {
          workerTodayLatest[record.worker_id] = record;
        }
      }

      // アラート判定ループ
      for (const workerId of Object.keys(workerTodayLatest)) {
        const latestRecord = workerTodayLatest[workerId];
        const worker = activeWorkers.find((w) => w.worker_id === workerId);
        const contractor = contractors.find((c) => c.contractor_id === worker?.contractor_id);

        if (!worker) continue;

        const workerName = worker.name;
        const contractorName = contractor?.name || '不明な外注先';

        // 判定A: 打刻漏れアラート（本日の最新打刻が出勤[CLOCK_IN]のまま）
        if (latestRecord.punch_type === 'CLOCK_IN') {
          alerts.push({
            id: `alert-punch-${workerId}`,
            type: 'PUNCH_MISSING',
            message: `【退勤打刻なし】${contractorName}の${workerName}さんは本日出勤中ですが、退勤打刻がありません。`,
            severity: 'medium',
            workerId,
            workerName,
            contractorName,
            occurredAt: latestRecord.clocked_at,
          });
        }

        // 判定B: 資格・講習の配置確認アラート
        // 本日入場しているが、安全講習（trainings）受講履歴が一度も登録されていない
        if (!worker.trainings || worker.trainings.length === 0) {
          alerts.push({
            id: `alert-training-${workerId}`,
            type: 'QUALIFICATION_ALERT',
            message: `【講習未受講】${contractorName}の${workerName}さんは安全特別講習履歴が登録されていません。`,
            severity: 'high',
            workerId,
            workerName,
            contractorName,
            occurredAt: latestRecord.clocked_at,
          });
        }

        // 本日入場しているが、現場資格（qualifications）が1つも登録されていない
        if (!worker.qualifications || worker.qualifications.length === 0) {
          alerts.push({
            id: `alert-qual-${workerId}`,
            type: 'QUALIFICATION_ALERT',
            message: `【資格未登録】${contractorName}の${workerName}さんは保有資格情報が登録されていません。`,
            severity: 'info',
            workerId,
            workerName,
            contractorName,
            occurredAt: latestRecord.clocked_at,
          });
        }
      }

      // 時間降順でソート
      alerts.sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());

      const summary: DashboardSummary = {
        activeContractorsCount: activeContractors.length,
        totalWorkersCount: activeWorkers.length,
        todayClockedInCount: clockedInWorkerIds.size,
        todayClockedOutCount: clockedOutWorkerIds.size,
        alerts,
      };

      logger.info('get_admin_dashboard_success', {
        contractors: summary.activeContractorsCount,
        workers: summary.totalWorkersCount,
        today_in: summary.todayClockedInCount,
        alerts_count: summary.alerts.length,
      });

      return {
        success: true,
        value: summary,
      };
    } catch (error) {
      logger.error('get_admin_dashboard_failed', error);
      return {
        success: false,
        error: {
          code: 'SYSTEM_ERROR',
          message: 'ダッシュボードサマリーの集計に失敗しました。',
        },
      };
    }
  }
}