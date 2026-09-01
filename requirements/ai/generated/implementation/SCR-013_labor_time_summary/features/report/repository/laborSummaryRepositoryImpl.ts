import { LaborSummaryRepository } from './laborSummaryRepository';
import { LaborSummaryRecord } from '../domain/laborSummary';
import { getDB } from '@/lib/db/indexedDb';

export class LaborSummaryRepositoryImpl implements LaborSummaryRepository {
  async getSummary(startDate: string, endDate: string, unit: 'daily' | 'monthly'): Promise<LaborSummaryRecord[]> {
    const db = await getDB();

    const { contractors, workers, attendances } = await new Promise<{
      contractors: any[];
      workers: any[];
      attendances: any[];
    }>((resolve, reject) => {
      const tx = db.transaction(['contractors', 'workers', 'attendance_records'], 'readonly');
      const contractorsStore = tx.objectStore('contractors');
      const workersStore = tx.objectStore('workers');
      const attendanceStore = tx.objectStore('attendance_records');

      const contractorsReq = contractorsStore.getAll();
      const workersReq = workersStore.getAll();
      const attendanceReq = attendanceStore.getAll();

      tx.oncomplete = () => {
        resolve({
          contractors: contractorsReq.result || [],
          workers: workersReq.result || [],
          attendances: attendanceReq.result || []
        });
      };
      tx.onerror = () => reject(tx.error);
    });

    const contractorsMap = new Map<string, string>();
    contractors.forEach(c => contractorsMap.set(c.contractor_id, c.name));

    const workersMap = new Map<string, { name: string; contractorName: string }>();
    workers.forEach(w => {
      workersMap.set(w.worker_id, {
        name: w.name,
        contractorName: contractorsMap.get(w.contractor_id) || '不詳'
      });
    });

    const startDateTime = new Date(startDate + 'T00:00:00').getTime();
    const endDateTime = new Date(endDate + 'T23:59:59').getTime();

    const filteredAttendances = attendances.filter(record => {
      const time = new Date(record.clocked_at).getTime();
      return time >= startDateTime && time <= endDateTime;
    });

    const workerRecords = new Map<string, any[]>();
    filteredAttendances.forEach(rec => {
      if (!workerRecords.has(rec.worker_id)) {
        workerRecords.set(rec.worker_id, []);
      }
      workerRecords.get(rec.worker_id)!.push(rec);
    });

    const summaryRecords: LaborSummaryRecord[] = [];

    workerRecords.forEach((records, workerId) => {
      const workerInfo = workersMap.get(workerId);
      if (!workerInfo) return;

      records.sort((a, b) => new Date(a.clocked_at).getTime() - new Date(b.clocked_at).getTime());

      const dailyGroup = new Map<string, any[]>();
      records.forEach(rec => {
        const dateStr = rec.clocked_at.substring(0, 10);
        if (!dailyGroup.has(dateStr)) {
          dailyGroup.set(dateStr, []);
        }
        dailyGroup.get(dateStr)!.push(rec);
      });

      dailyGroup.forEach((dayRecs, dateStr) => {
        let totalMs = 0;
        let lastInTime: number | null = null;

        dayRecs.forEach(rec => {
          if (rec.punch_type === 'CLOCK_IN') {
            lastInTime = new Date(rec.clocked_at).getTime();
          } else if (rec.punch_type === 'CLOCK_OUT' && lastInTime !== null) {
            const outTime = new Date(rec.clocked_at).getTime();
            totalMs += (outTime - lastInTime);
            lastInTime = null;
          }
        });

        const hours = totalMs / (1000 * 60 * 60);

        if (hours > 0) {
          const periodKey = unit === 'daily' ? dateStr : dateStr.substring(0, 7);
          const existing = summaryRecords.find(
            r => r.worker_id === workerId && r.period === periodKey
          );
          if (existing) {
            existing.total_hours = parseFloat((existing.total_hours + hours).toFixed(2));
          } else {
            summaryRecords.push({
              worker_id: workerId,
              worker_name: workerInfo.name,
              contractor_name: workerInfo.contractorName,
              period: periodKey,
              total_hours: parseFloat(hours.toFixed(2))
            });
          }
        }
      });
    });

    return summaryRecords.sort((a, b) => {
      if (a.period !== b.period) return a.period.localeCompare(b.period);
      return a.worker_name.localeCompare(b.worker_name);
    });
  }
}
"
    },
    {