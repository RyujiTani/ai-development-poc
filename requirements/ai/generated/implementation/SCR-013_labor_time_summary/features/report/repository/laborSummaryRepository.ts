import { initDB, Worker, Contractor, AttendanceRecord } from '@/lib/db/indexedDb';
import { LaborSummaryRow } from '../domain/types';

export interface ILaborSummaryRepository {
  getSummary(startDate: string, endDate: string, unit: 'daily' | 'monthly'): Promise<LaborSummaryRow[]>;
}

export class LaborSummaryRepository implements ILaborSummaryRepository {
  async getSummary(startDate: string, endDate: string, unit: 'daily' | 'monthly'): Promise<LaborSummaryRow[]> {
    const db = await initDB();

    const tx = db.transaction(['contractors', 'workers', 'attendance_records'], 'readonly');
    const contractorsStore = tx.objectStore('contractors');
    const workersStore = tx.objectStore('workers');
    const attendanceStore = tx.objectStore('attendance_records');

    const [contractors, workers, records] = await Promise.all([
      new Promise<Contractor[]>((resolve, reject) => {
        const req = contractorsStore.getAll();
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      }),
      new Promise<Worker[]>((resolve, reject) => {
        const req = workersStore.getAll();
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      }),
      new Promise<AttendanceRecord[]>((resolve, reject) => {
        const req = attendanceStore.getAll();
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      })
    ]);

    const contractorMap = new Map<string, string>();
    contractors.forEach(c => contractorMap.set(c.contractor_id, c.name));

    const workerMap = new Map<string, Worker>();
    workers.forEach(w => workerMap.set(w.worker_id, w));

    const startMs = new Date(`${startDate}T00:00:00+09:00`).getTime();
    const endMs = new Date(`${endDate}T23:59:59+09:00`).getTime();

    const filteredRecords = records.filter(r => {
      const time = new Date(r.clocked_at).getTime();
      return time >= startMs && time <= endMs;
    });

    const groupedByDateAndWorker = new Map<string, AttendanceRecord[]>();

    filteredRecords.forEach(r => {
      const dateStr = r.clocked_at.substring(0, 10);
      const key = `${r.worker_id}_${dateStr}`;
      if (!groupedByDateAndWorker.has(key)) {
        groupedByDateAndWorker.set(key, []);
      }
      groupedByDateAndWorker.get(key)!.push(r);
    });

    const dailyHoursMap = new Map<string, { workerId: string; date: string; hours: number }>();

    groupedByDateAndWorker.forEach((recs, key) => {
      recs.sort((a, b) => new Date(a.clocked_at).getTime() - new Date(b.clocked_at).getTime());

      let totalMs = 0;
      let lastInTime: number | null = null;

      recs.forEach(r => {
        if (r.punch_type === 'CLOCK_IN') {
          lastInTime = new Date(r.clocked_at).getTime();
        } else if (r.punch_type === 'CLOCK_OUT' && lastInTime !== null) {
          totalMs += new Date(r.clocked_at).getTime() - lastInTime;
          lastInTime = null;
        }
      });

      const hours = Math.round((totalMs / (1000 * 60 * 60)) * 10) / 10;
      const [workerId, date] = key.split('_');

      dailyHoursMap.set(key, { workerId, date, hours });
    });

    const summaryRows: LaborSummaryRow[] = [];

    if (unit === 'daily') {
      dailyHoursMap.forEach((val) => {
        const worker = workerMap.get(val.workerId);
        if (!worker) return;

        summaryRows.push({
          workerId: val.workerId,
          workerName: worker.name,
          contractorId: worker.contractor_id,
          contractorName: contractorMap.get(worker.contractor_id) || '不明',
          dateOrMonth: val.date,
          totalHours: val.hours
        });
      });
    } else {
      const monthlyMap = new Map<string, { workerId: string; month: string; hours: number }>();

      dailyHoursMap.forEach((val) => {
        const month = val.date.substring(0, 7);
        const mKey = `${val.workerId}_${month}`;

        if (!monthlyMap.has(mKey)) {
          monthlyMap.set(mKey, { workerId: val.workerId, month, hours: 0 });
        }
        monthlyMap.get(mKey)!.hours += val.hours;
      });

      monthlyMap.forEach((val) => {
        const worker = workerMap.get(val.workerId);
        if (!worker) return;

        summaryRows.push({
          workerId: val.workerId,
          workerName: worker.name,
          contractorId: worker.contractor_id,
          contractorName: contractorMap.get(worker.contractor_id) || '不明',
          dateOrMonth: val.month,
          totalHours: Math.round(val.hours * 10) / 10
        });
      });
    }

    return summaryRows.sort((a, b) => {
      if (b.dateOrMonth !== a.dateOrMonth) {
        return b.dateOrMonth.localeCompare(a.dateOrMonth);
      }
      if (a.contractorName !== b.contractorName) {
        return a.contractorName.localeCompare(b.contractorName);
      }
      return a.workerName.localeCompare(b.workerName);
    });
  }
}