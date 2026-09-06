import { initDB } from '@/lib/db/indexedDB';
import { Worker, AttendanceRecord } from '@/features/attendance/domain/types';

export interface DashboardData {
  summary: {
    active_workers_count: number;
    clocked_in_count: number;
    clocked_out_count: number;
  };
  alerts: Array<{
    alert_id: string;
    level: 'HIGH' | 'MEDIUM' | 'LOW';
    message: string;
    occurred_at: string;
  }>;
}

export async function getDashboardData(): Promise<DashboardData> {
  const db = await initDB();

  // 1. アクティブな作業員の総数を算出
  const workersTx = db.transaction('workers', 'readonly');
  const workersStore = workersTx.objectStore('workers');
  const allWorkers = (await workersStore.getAll()) as Worker[];
  const activeWorkers = allWorkers.filter((w) => w.status === 'ACTIVE');
  const activeWorkersCount = activeWorkers.length;

  // 2. 本日の出退勤の打刻者数を算出 (JSTベース)
  const attendanceTx = db.transaction('attendance_records', 'readonly');
  const attendanceStore = attendanceTx.objectStore('attendance_records');
  const allAttendance = (await attendanceStore.getAll()) as AttendanceRecord[];

  const todayStr = getTodayJST(); // "YYYY-MM-DD"

  // 本日の打刻データのみ抽出
  const todayAttendance = allAttendance.filter((record) => {
    const recordDate = new Date(record.clocked_at);
    const utc = recordDate.getTime() + recordDate.getTimezoneOffset() * 60000;
    const jst = new Date(utc + 3600000 * 9);
    const y = jst.getFullYear();
    const m = String(jst.getMonth() + 1).padStart(2, '0');
    const date = String(jst.getDate()).padStart(2, '0');
    const recordDayStr = `${y}-${m}-${date}`;
    return recordDayStr === todayStr;
  });

  const clockedInWorkerIds = new Set<string>();
  const clockedOutWorkerIds = new Set<string>();

  todayAttendance.forEach((record) => {
    if (record.punch_type === 'CLOCK_IN') {
      clockedInWorkerIds.add(record.worker_id);
    } else if (record.punch_type === 'CLOCK_OUT') {
      clockedOutWorkerIds.add(record.worker_id);
    }
  });

  // 3. 直近アラートの生成 (資格/安全教育受講、打刻漏れの簡易的な算出)
  const alerts: DashboardData['alerts'] = [];
  const now = new Date();

  // HIGH アラート例: 安全教育（雇入れ時安全衛生教育: TRAIN_01）が未受講の作業員が出勤打刻を行っている場合
  activeWorkers.forEach((worker) => {
    if (clockedInWorkerIds.has(worker.worker_id)) {
      const hasSafetyTraining = worker.trainings?.some((t) => t.code === 'TRAIN_01');
      if (!hasSafetyTraining) {
        alerts.push({
          alert_id: `alert-training-missing-${worker.worker_id}`,
          level: 'HIGH',
          message: `【安全警告】安全教育(TRAIN_01)未受講の作業員（${worker.name} さん）が出勤打刻を行っています。`,
          occurred_at: now.toISOString(),
        });
      }
    }
  });

  // MEDIUM アラート例: 出勤打刻から2時間以上経過しても退勤打刻のない作業員 (打刻漏れの可能性)
  activeWorkers.forEach((worker) => {
    const hasClockedIn = clockedInWorkerIds.has(worker.worker_id);
    const hasClockedOut = clockedOutWorkerIds.has(worker.worker_id);
    if (hasClockedIn && !hasClockedOut) {
      const workerPunches = todayAttendance.filter(
        (p) => p.worker_id === worker.worker_id && p.punch_type === 'CLOCK_IN'
      );
      if (workerPunches.length > 0) {
        workerPunches.sort((a, b) => new Date(b.clocked_at).getTime() - new Date(a.clocked_at).getTime());
        const lastClockIn = new Date(workerPunches[0].clocked_at);
        const diffMs = now.getTime() - lastClockIn.getTime();
        const diffHours = diffMs / (1000 * 60 * 60);

        if (diffHours > 2) {
          alerts.push({
            alert_id: `alert-out-missing-${worker.worker_id}`,
            level: 'MEDIUM',
            message: `${worker.name} さん: 出勤打刻から2時間以上経過していますが、退勤打刻がありません。`,
            occurred_at: workerPunches[0].clocked_at,
          });
        }
      }
    }
  });

  // 初期見栄え、またはアラートがない場合のお知らせ表示 (LOW)
  if (alerts.length === 0) {
    alerts.push({
      alert_id: 'alert-info-normal',
      level: 'LOW',
      message: '本日の配置・打刻状況に異常はありません。稼働は順調です。',
      occurred_at: new Date(now.getTime() - 5 * 60000).toISOString(),
    });
  }

  // アラートの並び替え (HIGH -> MEDIUM -> LOW)
  const levelPriority = { HIGH: 3, MEDIUM: 2, LOW: 1 };
  alerts.sort((a, b) => levelPriority[b.level] - levelPriority[a.level]);

  return {
    summary: {
      active_workers_count: activeWorkersCount,
      clocked_in_count: clockedInWorkerIds.size,
      clocked_out_count: clockedOutWorkerIds.size,
    },
    alerts,
  };
}

function getTodayJST(): string {
  const d = new Date();
  const utc = d.getTime() + d.getTimezoneOffset() * 60000;
  const jst = new Date(utc + 3600000 * 9);
  const y = jst.getFullYear();
  const m = String(jst.getMonth() + 1).padStart(2, '0');
  const date = String(jst.getDate()).padStart(2, '0');
  return `${y}-${m}-${date}`;
}