import { initDB } from '@/lib/db/indexedDB';
import { AttendanceRecord, Worker, Contractor } from '@/features/attendance/domain/types';

export interface LaborSummaryRecord {
  worker_id: string;
  worker_name: string;
  contractor_id: string;
  contractor_name: string;
  date: string; // YYYY-MM-DD or YYYY-MM
  hours: number;
}

function toJSTDateString(isoString: string): string {
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return '';
  const utc = d.getTime() + d.getTimezoneOffset() * 60000;
  const jst = new Date(utc + 3600000 * 9);
  const y = jst.getFullYear();
  const m = String(jst.getMonth() + 1).padStart(2, '0');
  const date = String(jst.getDate()).padStart(2, '0');
  return `${y}-${m}-${date}`;
}

export async function getLaborSummary(params: {
  startDate: string; // YYYY-MM-DD or YYYY-MM
  endDate: string;   // YYYY-MM-DD or YYYY-MM
  unit: 'daily' | 'monthly';
}): Promise<LaborSummaryRecord[]> {
  const db = await initDB();

  // 全打刻レコード取得
  const attTx = db.transaction('attendance_records', 'readonly');
  const attStore = attTx.objectStore('attendance_records');
  const allAttendance = (await attStore.getAll()) as AttendanceRecord[];

  // 全作業員取得
  const workerTx = db.transaction('workers', 'readonly');
  const workerStore = workerTx.objectStore('workers');
  const allWorkers = (await workerStore.getAll()) as Worker[];
  const workerMap = new Map(allWorkers.map((w) => [w.worker_id, w]));

  // 全外注先取得
  const contTx = db.transaction('contractors', 'readonly');
  const contStore = contTx.objectStore('contractors');
  const allContractors = (await contStore.getAll()) as Contractor[];
  const contractorMap = new Map(allContractors.map((c) => [c.contractor_id, c]));

  // 作業員ごとに打刻レコードを分類
  const workerPunchesMap = new Map<string, AttendanceRecord[]>();
  for (const rec of allAttendance) {
    if (!workerPunchesMap.has(rec.worker_id)) {
      workerPunchesMap.set(rec.worker_id, []);
    }
    workerPunchesMap.get(rec.worker_id)!.push(rec);
  }

  const dailySummaryMap = new Map<string, { hours: number; worker_id: string; contractor_id: string }>();

  // ペアリング & 日次集計
  for (const [workerId, punches] of workerPunchesMap.entries()) {
    // 日時昇順ソート
    punches.sort((a, b) => new Date(a.clocked_at).getTime() - new Date(b.clocked_at).getTime());

    let lastIn: AttendanceRecord | null = null;
    for (const p of punches) {
      if (p.punch_type === 'CLOCK_IN') {
        lastIn = p;
      } else if (p.punch_type === 'CLOCK_OUT') {
        if (lastIn) {
          const inTime = new Date(lastIn.clocked_at).getTime();
          const outTime = new Date(p.clocked_at).getTime();
          if (outTime > inTime) {
            const diffHours = (outTime - inTime) / 3600000;
            const jstDate = toJSTDateString(lastIn.clocked_at);

            const key = `${workerId}_${jstDate}`;
            const existing = dailySummaryMap.get(key) || { hours: 0, worker_id: workerId, contractor_id: lastIn.contractor_id };
            existing.hours += diffHours;
            dailySummaryMap.set(key, existing);
          }
          lastIn = null;
        }
      }
    }
  }

  // 日次データをフィルタリングおよび月次へ集約
  const resultRecords: LaborSummaryRecord[] = [];

  if (params.unit === 'daily') {
    for (const [key, val] of dailySummaryMap.entries()) {
      const date = key.split('_')[1];
      if (date >= params.startDate && date <= params.endDate) {
        const worker = workerMap.get(val.worker_id);
        const contractor = contractorMap.get(val.contractor_id);
        resultRecords.push({
          worker_id: val.worker_id,
          worker_name: worker ? worker.name : '不明な作業員',
          contractor_id: val.contractor_id,
          contractor_name: contractor ? contractor.name : '不明な外注先',
          date,
          hours: Math.round(val.hours * 100) / 100,
        });
      }
    }
  } else {
    // 月次
    // 開始日・終了日を月形式 (YYYY-MM) にして比較
    const startMonth = params.startDate.substring(0, 7);
    const endMonth = params.endDate.substring(0, 7);

    const monthlyMap = new Map<string, { hours: number; worker_id: string; contractor_id: string }>();

    for (const [key, val] of dailySummaryMap.entries()) {
      const date = key.split('_')[1];
      const month = date.substring(0, 7);
      if (month >= startMonth && month <= endMonth) {
        const mKey = `${val.worker_id}_${month}`;
        const existing = monthlyMap.get(mKey) || { hours: 0, worker_id: val.worker_id, contractor_id: val.contractor_id };
        existing.hours += val.hours;
        monthlyMap.set(mKey, existing);
      }
    }

    for (const [key, val] of monthlyMap.entries()) {
      const month = key.split('_')[1];
      const worker = workerMap.get(val.worker_id);
      const contractor = contractorMap.get(val.contractor_id);
      resultRecords.push({
        worker_id: val.worker_id,
        worker_name: worker ? worker.name : '不明な作業員',
        contractor_id: val.contractor_id,
        contractor_name: contractor ? contractor.name : '不明な外注先',
        date: month,
        hours: Math.round(val.hours * 100) / 100,
      });
    }
  }

  // ソート（日付降順、外注先企業名昇順、作業員名昇順）
  resultRecords.sort((a, b) => {
    if (b.date !== a.date) {
      return b.date.localeCompare(a.date);
    }
    if (a.contractor_name !== b.contractor_name) {
      return a.contractor_name.localeCompare(b.contractor_name, 'ja');
    }
    return a.worker_name.localeCompare(b.worker_name, 'ja');
  });

  return resultRecords;
}