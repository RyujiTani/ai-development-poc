import { IAttendanceRepository } from '../repository/attendanceRepository';
import { LaborSummary } from '../domain/types';

export interface LaborSummaryInput {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  unit: 'daily' | 'monthly';
}

export class LaborSummaryUseCase {
  constructor(private repository: IAttendanceRepository) {}

  async execute(input: LaborSummaryInput): Promise<LaborSummary[]> {
    const [workers, contractors, records] = await Promise.all([
      this.repository.getWorkers(),
      this.repository.getContractors(),
      this.repository.getAttendanceRecords(),
    ]);

    const contractorMap = new Map(contractors.map(c => [c.contractor_id, c.name]));
    const workerMap = new Map(workers.map(w => [w.worker_id, w]));

    const start = new Date(`${input.startDate}T00:00:00Z`);
    const end = new Date(`${input.endDate}T23:59:59Z`);

    // worker_id -> period -> { totalMs: number; lastClockIn?: number }
    const summaryMap = new Map<string, Map<string, { totalMs: number; lastClockIn?: number }>>();

    // 出勤と退勤のペアリングのため、打刻を時系列でソート
    const sortedRecords = [...records]
      .filter(r => {
        const d = new Date(r.clocked_at);
        return d >= start && d <= end;
      })
      .sort((a, b) => new Date(a.clocked_at).getTime() - new Date(b.clocked_at).getTime());

    for (const record of sortedRecords) {
      const worker = workerMap.get(record.worker_id);
      if (!worker) continue;

      const recordDate = new Date(record.clocked_at);
      let period = '';
      if (input.unit === 'daily') {
        const y = recordDate.getUTCFullYear();
        const m = String(recordDate.getUTCMonth() + 1).padStart(2, '0');
        const d = String(recordDate.getUTCDate()).padStart(2, '0');
        period = `${y}-${m}-${d}`;
      } else {
        const y = recordDate.getUTCFullYear();
        const m = String(recordDate.getUTCMonth() + 1).padStart(2, '0');
        period = `${y}-${m}`;
      }

      if (!summaryMap.has(record.worker_id)) {
        summaryMap.set(record.worker_id, new Map());
      }
      const periodMap = summaryMap.get(record.worker_id)!;
      if (!periodMap.has(period)) {
        periodMap.set(period, { totalMs: 0 });
      }

      const state = periodMap.get(period)!;

      if (record.punch_type === 'CLOCK_IN') {
        state.lastClockIn = new Date(record.clocked_at).getTime();
      } else if (record.punch_type === 'CLOCK_OUT' && state.lastClockIn !== undefined) {
        const outTime = new Date(record.clocked_at).getTime();
        const diff = outTime - state.lastClockIn;
        if (diff > 0) {
          state.totalMs += diff;
        }
        delete state.lastClockIn; // ペア成立でリセット
      }
    }

    const result: LaborSummary[] = [];
    for (const [workerId, periodMap] of summaryMap.entries()) {
      const worker = workerMap.get(workerId);
      if (!worker) continue;
      const contractorName = contractorMap.get(worker.contractor_id) || '不明外注先';

      for (const [period, state] of periodMap.entries()) {
        const totalHours = Math.round((state.totalMs / (1000 * 60 * 60)) * 100) / 100;
        if (totalHours > 0) {
          result.push({
            worker_id: workerId,
            worker_name: worker.name,
            contractor_id: worker.contractor_id,
            contractor_name: contractorName,
            period,
            total_hours: totalHours,
          });
        }
      }
    }

    return result.sort((a, b) => {
      if (a.period !== b.period) return a.period.localeCompare(b.period);
      if (a.contractor_name !== b.contractor_name) return a.contractor_name.localeCompare(b.contractor_name);
      return a.worker_name.localeCompare(b.worker_name);
    });
  }
}