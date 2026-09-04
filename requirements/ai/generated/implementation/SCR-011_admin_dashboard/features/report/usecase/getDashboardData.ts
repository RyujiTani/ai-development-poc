import { getAllFromStore, initializeSeedData } from '../../../lib/db/indexedDB';
import { AttendanceRecord, Worker, Contractor } from '../../attendance/domain/types';

export interface DashboardAlert {
  alert_id: string;
  type: 'WARNING' | 'INFO' | 'ERROR';
  message: string;
  occurred_at: string;
}

export interface DashboardSummary {
  total_active_workers: number;
  working_contractors_count: number;
}

export interface DashboardData {
  summary: DashboardSummary;
  alerts: DashboardAlert[];
}

export async function getDashboardData(): Promise<DashboardData> {
  // Ensure we have some seed data loaded
  await initializeSeedData().catch(() => {});

  const attendanceRecords = await getAllFromStore<AttendanceRecord>('attendance_records');
  const contractors = await getAllFromStore<Contractor>('contractors');
  const workers = await getAllFromStore<Worker>('workers');

  // Calculate total active workers today
  const todayStr = new Date().toISOString().split('T')[0];
  const todayAttendance = attendanceRecords.filter((record) => {
    return record.clocked_at.startsWith(todayStr);
  });

  // Unique workers clocked in today (and not clocked out, or simply currently active)
  // To keep it clean: count unique worker_ids which have CLOCK_IN and have not yet CLOCK_OUT,
  // or simple count of active working individuals on site today.
  const workerPunchStates: Record<string, { lastPunch: string; contractor_id: string }> = {};
  
  // Sort by clocked_at ascending to parse sequential state
  const sortedRecords = [...todayAttendance].sort((a, b) => 
    new Date(a.clocked_at).getTime() - new Date(b.clocked_at).getTime()
  );

  sortedRecords.forEach((record) => {
    workerPunchStates[record.worker_id] = {
      lastPunch: record.punch_type,
      contractor_id: record.contractor_id
    };
  });

  const activeWorkerIds = Object.keys(workerPunchStates).filter(
    (workerId) => workerPunchStates[workerId].lastPunch === 'CLOCK_IN'
  );

  const total_active_workers = activeWorkerIds.length;

  // Working contractors are those with at least one active worker today
  const activeContractorIds = new Set(
    activeWorkerIds.map((workerId) => workerPunchStates[workerId].contractor_id)
  );
  const working_contractors_count = activeContractorIds.size;

  // Generate mock alerts based on logical gaps
  const alerts: DashboardAlert[] = [];

  // Check for workers who clocked in but have been active for > 10 hours (potential un-clocked-out)
  const now = new Date();
  activeWorkerIds.forEach((workerId) => {
    const workerRecords = sortedRecords.filter(r => r.worker_id === workerId);
    const lastClockIn = workerRecords.find(r => r.punch_type === 'CLOCK_IN');
    if (lastClockIn) {
      const elapsedHours = (now.getTime() - new Date(lastClockIn.clocked_at).getTime()) / (1000 * 60 * 60);
      if (elapsedHours > 10) {
        const workerInfo = workers.find(w => w.worker_id === workerId);
        const contractorInfo = contractors.find(c => c.contractor_id === workerInfo?.contractor_id);
        alerts.push({
          alert_id: `alert-overtime-${workerId}`,
          type: 'WARNING',
          message: `【打刻漏れ注意】${contractorInfo?.name || '外注先'} の ${workerInfo?.name || '作業員'} が10時間以上連続して「出勤」状態です。退勤打刻漏れの可能性があります。`,
          occurred_at: new Date().toISOString()
        });
      }
    }
  });

  // Default informational alerts if no real issues
  if (alerts.length === 0) {
    alerts.push({
      alert_id: 'alert-default-1',
      type: 'INFO',
      message: '本日の打刻状況はすべて正常です。資格要件不整合や打刻漏れは検知されていません。',
      occurred_at: new Date().toISOString()
    });
  }

  // Also check if some workers are active but lack required qualifications (example logic)
  activeWorkerIds.forEach((workerId) => {
    const workerInfo = workers.find(w => w.worker_id === workerId);
    if (workerInfo && workerInfo.qualifications.length === 0) {
      alerts.push({
        alert_id: `alert-qual-${workerId}`,
        type: 'WARNING',
        message: `【配置要件確認】${workerInfo.name} は登録されている資格がありません。高所や玉掛け作業を伴う配置に注意してください。`,
        occurred_at: new Date().toISOString()
      });
    }
  });

  return {
    summary: {
      total_active_workers,
      working_contractors_count
    },
    alerts
  };
}