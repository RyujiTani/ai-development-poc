import { openDB, checkAndSeed } from '@/lib/db/indexedDB';
import { AttendanceRecord, Worker, Contractor } from '@/features/attendance/domain/attendance';

export interface DashboardSummary {
  todayWorkingCount: number;
  todayTotalPunchedCount: number;
  activeContractorCount: number;
  totalWorkerCount: number;
}

export interface DashboardAlert {
  alert_id: string;
  type: 'WARNING' | 'ERROR' | 'INFO';
  message: string;
  target_name: string;
  occurred_at: string;
}

export interface DashboardData {
  summary: DashboardSummary;
  alerts: DashboardAlert[];
}

export interface DashboardRepository {
  getDashboardData(): Promise<DashboardData>;
}

export class IndexedDBDashboardRepository implements DashboardRepository {
  async getDashboardData(): Promise<DashboardData> {
    await checkAndSeed();
    const db = await openDB();

    const tx = db.transaction(['attendance_records', 'workers', 'contractors'], 'readonly');
    const attendanceStore = tx.objectStore('attendance_records');
    const workerStore = tx.objectStore('workers');
    const contractorStore = tx.objectStore('contractors');

    const getAllRequest = <T>(request: IDBRequest<T[]>): Promise<T[]> => {
      return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    };

    const attendances = await getAllRequest<AttendanceRecord>(attendanceStore.getAll());
    const workers = await getAllRequest<Worker>(workerStore.getAll());
    const contractors = await getAllRequest<Contractor>(contractorStore.getAll());

    const todayStr = new Date().toISOString().split('T')[0];
    const todayAttendances = attendances.filter(a => a.clocked_at.startsWith(todayStr));

    const workerStatusMap: { [worker_id: string]: 'IN' | 'OUT' } = {};
    const sortedTodayAttendances = [...todayAttendances].sort(
      (a, b) => new Date(a.clocked_at).getTime() - new Date(b.clocked_at).getTime()
    );

    sortedTodayAttendances.forEach(a => {
      if (a.punch_type === 'CLOCK_IN') {
        workerStatusMap[a.worker_id] = 'IN';
      } else {
        workerStatusMap[a.worker_id] = 'OUT';
      }
    });

    const todayWorkingCount = Object.values(workerStatusMap).filter(status => status === 'IN').length;
    const todayTotalPunchedCount = new Set(todayAttendances.map(a => a.worker_id)).size;
    const activeContractorCount = contractors.filter(c => c.status === 'ACTIVE').length;
    const totalWorkerCount = workers.filter(w => w.status === 'ACTIVE').length;

    const alerts: DashboardAlert[] = [];
    const now = new Date();

    Object.entries(workerStatusMap).forEach(([workerId, status]) => {
      if (status === 'IN') {
        const lastIn = sortedTodayAttendances.findLast(a => a.worker_id === workerId && a.punch_type === 'CLOCK_IN');
        if (lastIn) {
          const hours = (now.getTime() - new Date(lastIn.clocked_at).getTime()) / (1000 * 60 * 60);
          if (hours > 8) {
            const workerName = workers.find(w => w.worker_id === workerId)?.name || '不明な作業員';
            alerts.push({
              alert_id: `alert-long-working-${workerId}`,
              type: 'WARNING',
              message: '連続勤務時間が8時間を超過しています（現在進行中）',
              target_name: workerName,
              occurred_at: lastIn.clocked_at
            });
          }
        }
      }
    });

    const unqualifiedWorkers = workers.filter(w => w.qualifications.length === 0);
    if (unqualifiedWorkers.length > 0) {
      alerts.push({
        alert_id: 'alert-no-qualification',
        type: 'INFO',
        message: '資格情報が未登録の作業員が登録されています。確認してください。',
        target_name: `${unqualifiedWorkers.length}名の作業員`,
        occurred_at: new Date().toISOString()
      });
    }

    alerts.push({
      alert_id: 'alert-photo-check',
      type: 'WARNING',
      message: '打刻写真の目視確認が未完了の項目があります。',
      target_name: '鈴木工業 本日分打刻',
      occurred_at: `${todayStr}T08:15:00Z`
    });

    return {
      summary: {
        todayWorkingCount,
        todayTotalPunchedCount,
        activeContractorCount,
        totalWorkerCount
      },
      alerts
    };
  }
}
"
    },
    {