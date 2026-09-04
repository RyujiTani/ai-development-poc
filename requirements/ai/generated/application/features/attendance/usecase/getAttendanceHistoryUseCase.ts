import { Result } from '../../../lib/error/appError';
import { logger } from '../../../lib/logger/logger';
import { AttendanceRepository } from '../repository/attendanceRepository';
import { WorkerRepository } from '../../worker/repository/workerRepository';
import { ContractorRepository } from '../../contractor/repository/contractorRepository';

export interface AttendanceHistoryItem {
  attendance_id: string;
  worker_id: string;
  worker_name: string;
  contractor_id: string;
  contractor_name: string;
  punch_type: 'CLOCK_IN' | 'CLOCK_OUT';
  clocked_at: string;
  punched_by: string;
  photo_object_id: string;
  created_at: string;
}

export interface GetAttendanceHistoryFilter {
  date?: string; // YYYY-MM-DD
  contractorId?: string;
}

export class GetAttendanceHistoryUseCase {
  constructor(
    private attendanceRepository: AttendanceRepository,
    private workerRepository: WorkerRepository,
    private contractorRepository: ContractorRepository
  ) {}

  async execute(filter?: GetAttendanceHistoryFilter): Promise<Result<AttendanceHistoryItem[]>> {
    try {
      logger.info('get_attendance_history_attempt', { filter });

      const [records, workers, contractors] = await Promise.all([
        this.attendanceRepository.findAllRecords(),
        this.workerRepository.findAll(),
        this.contractorRepository.findAll(),
      ]);

      const workerMap = new Map(workers.map((w) => [w.worker_id, w]));
      const contractorMap = new Map(contractors.map((c) => [c.contractor_id, c]));

      let items: AttendanceHistoryItem[] = records.map((r) => {
        const worker = workerMap.get(r.worker_id);
        const contractor = contractorMap.get(r.contractor_id);

        return {
          attendance_id: r.attendance_id,
          worker_id: r.worker_id,
          worker_name: worker ? worker.name : '不明な作業員',
          contractor_id: r.contractor_id,
          contractor_name: contractor ? contractor.name : '不明な外注先',
          punch_type: r.punch_type,
          clocked_at: r.clocked_at,
          punched_by: r.punched_by,
          photo_object_id: r.photo_object_id,
          created_at: r.created_at,
        };
      });

      // フィルタ適用
      if (filter) {
        if (filter.date) {
          items = items.filter((item) => {
            const d = new Date(item.clocked_at);
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            const itemDateStr = `${year}-${month}-${day}`;
            return itemDateStr === filter.date;
          });
        }
        if (filter.contractorId) {
          items = items.filter((item) => item.contractor_id === filter.contractorId);
        }
      }

      // 日時降順でソート
      items.sort((a, b) => new Date(b.clocked_at).getTime() - new Date(a.clocked_at).getTime());

      logger.info('get_attendance_history_success', { count: items.length });
      return { success: true, value: items };
    } catch (error) {
      logger.error('get_attendance_history_failed', error);
      return {
        success: false,
        error: { code: 'SYSTEM_ERROR', message: '打刻履歴の取得に失敗しました。' },
      };
    }
  }
}