import { Worker, Contractor, AttendanceRecord } from '../domain/types';
import { getAllFromStore } from '../../../lib/db/idb';

export interface IAttendanceRepository {
  getWorkers(): Promise<Worker[]>;
  getContractors(): Promise<Contractor[]>;
  getAttendanceRecords(): Promise<AttendanceRecord[]>;
}

export class IndexedDBAttendanceRepository implements IAttendanceRepository {
  async getWorkers(): Promise<Worker[]> {
    try {
      return await getAllFromStore<Worker>('workers');
    } catch {
      return [];
    }
  }

  async getContractors(): Promise<Contractor[]> {
    try {
      return await getAllFromStore<Contractor>('contractors');
    } catch {
      return [];
    }
  }

  async getAttendanceRecords(): Promise<AttendanceRecord[]> {
    try {
      return await getAllFromStore<AttendanceRecord>('attendance_records');
    } catch {
      return [];
    }
  }
}