import { AttendanceRecord, AttendanceCorrection } from '@/features/attendance/domain/types';
import { idb } from '@/lib/db/idbWrapper';

export interface IAttendanceRepository {
  saveRecord(record: AttendanceRecord): Promise<void>;
  getRecordById(attendanceId: string): Promise<AttendanceRecord | null>;
  saveCorrection(correction: AttendanceCorrection): Promise<void>;
  generateId(prefix: string): string;
}

export class AttendanceRepository implements IAttendanceRepository {
  public async saveRecord(record: AttendanceRecord): Promise<void> {
    await idb.put<AttendanceRecord>('attendance_records', record);
  }

  public async getRecordById(attendanceId: string): Promise<AttendanceRecord | null> {
    return await idb.get<AttendanceRecord>('attendance_records', attendanceId);
  }

  public async saveCorrection(correction: AttendanceCorrection): Promise<void> {
    await idb.put<AttendanceCorrection>('attendance_corrections', correction);
  }

  public generateId(prefix: string): string {
    return `${prefix}-${Math.floor(100000 + Math.random() * 900000)}`;
  }
}

export const attendanceRepository = new AttendanceRepository();