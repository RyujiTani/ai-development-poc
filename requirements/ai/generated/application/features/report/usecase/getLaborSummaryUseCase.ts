import { Result } from '../../../lib/error/appError';
import { logger } from '../../../lib/logger/logger';
import { AttendanceRepository } from '../../attendance/repository/attendanceRepository';
import { WorkerRepository } from '../../worker/repository/workerRepository';
import { ContractorRepository } from '../../contractor/repository/contractorRepository';

export interface LaborSummaryItem {
  id: string;
  worker_id: string;
  worker_name: string;
  contractor_id: string;
  contractor_name: string;
  period: string; // YYYY-MM-DD (daily) or YYYY-MM (monthly)
  total_working_hours: number;
}

export interface GetLaborSummaryParams {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  unit: 'daily' | 'monthly';
}

export class GetLaborSummaryUseCase {
  constructor(
    private attendanceRepository: AttendanceRepository,
    private workerRepository: WorkerRepository,
    private contractorRepository: ContractorRepository
  ) {}

  async execute(params: GetLaborSummaryParams): Promise<Result<LaborSummaryItem[]>> {
    try {
      logger.info('get_labor_summary_attempt', { params });

      const { startDate, endDate, unit } = params;

      if (!startDate || !endDate) {
        return {
          success: false,
          error: { code: 'INVALID_ARGUMENT', message: '開始日と終了日は必須です。' },
        };
      }

      const start = new Date(startDate);
      const end = new Date(endDate);
      if (end < start) {
        return {
          success: false,
          error: { code: 'INVALID_ARGUMENT', message: '終了日は開始日以降の日付を選択してください。' },
        };
      }

      const [records, workers, contractors] = await Promise.all([
        this.attendanceRepository.findAllRecords(),
        this.workerRepository.findAll(),
        this.contractorRepository.findAll(),
      ]);

      const workerMap = new Map(workers.map((w) => [w.worker_id, w]));
      const contractorMap = new Map(contractors.map((c) => [c.contractor_id, c]));

      // 期間絞り込み（ローカルタイムベース）
      const startMs = new Date(`${startDate}T00:00:00`).getTime();
      const endMs = new Date(`${endDate}T23:59:59.999`).getTime();

      const filteredRecords = records.filter((r) => {
        const t = new Date(r.clocked_at).getTime();
        return t >= startMs && t <= endMs;
      });

      // 作業員ごとにグループ化
      const workerRecords: Record<string, typeof filteredRecords> = {};
      for (const record of filteredRecords) {
        if (!workerRecords[record.worker_id]) {
          workerRecords[record.worker_id] = [];
        }
        workerRecords[record.worker_id].push(record);
      }

      const summaryItems: LaborSummaryItem[] = [];

      for (const workerId of Object.keys(workerRecords)) {
        const worker = workerMap.get(workerId);
        const contractor = worker ? contractorMap.get(worker.contractor_id) : undefined;
        const workerName = worker ? worker.name : '不明な作業員';
        const contractorName = contractor ? contractor.name : '不明な外注先';
        const contractorId = worker ? worker.contractor_id : '';

        // 時系列昇順でソート
        const sorted = workerRecords[workerId].sort(
          (a, b) => new Date(a.clocked_at).getTime() - new Date(b.clocked_at).getTime()
        );

        // CLOCK_IN と CLOCK_OUT のペアから労働時間を算出
        const pairs: Array<{ inTime: Date; outTime: Date }> = [];
        let tempIn: Date | null = null;

        for (const r of sorted) {
          if (r.punch_type === 'CLOCK_IN') {
            tempIn = new Date(r.clocked_at);
          } else if (r.punch_type === 'CLOCK_OUT' && tempIn) {
            pairs.push({ inTime: tempIn, outTime: new Date(r.clocked_at) });
            tempIn = null;
          }
        }

        // 単位（daily / monthly）ごとに時間を集計
        const periodWorkingHours: Record<string, number> = {};

        for (const pair of pairs) {
          const diffMs = pair.outTime.getTime() - pair.inTime.getTime();
          const hours = diffMs / (1000 * 60 * 60);

          const d = pair.inTime;
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');

          const periodKey = unit === 'daily' ? `${year}-${month}-${day}` : `${year}-${month}`;

          if (!periodWorkingHours[periodKey]) {
            periodWorkingHours[periodKey] = 0;
          }
          periodWorkingHours[periodKey] += hours;
        }

        for (const period of Object.keys(periodWorkingHours)) {
          // 小数点第2位まで四捨五入
          const hoursRounded = Math.round(periodWorkingHours[period] * 100) / 100;

          summaryItems.push({
            id: `${workerId}-${period}`,
            worker_id: workerId,
            worker_name: workerName,
            contractor_id: contractorId,
            contractor_name: contractorName,
            period,
            total_working_hours: hoursRounded,
          });
        }
      }

      // 期間（降順）、外注先、作業員名でソート
      summaryItems.sort((a, b) => {
        if (b.period !== a.period) {
          return b.period.localeCompare(a.period);
        }
        if (a.contractor_name !== b.contractor_name) {
          return a.contractor_name.localeCompare(b.contractor_name);
        }
        return a.worker_name.localeCompare(b.worker_name);
      });

      logger.info('get_labor_summary_success', { count: summaryItems.length });
      return { success: true, value: summaryItems };
    } catch (error) {
      logger.error('get_labor_summary_failed', error);
      return {
        success: false,
        error: { code: 'SYSTEM_ERROR', message: '労働時間データの集計に失敗しました。' },
      };
    }
  }
}