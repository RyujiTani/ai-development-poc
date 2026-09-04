import { IAttendanceRepository, attendanceRepository } from '../repository/attendanceRepository';
import { IWorkerRepository, workerRepository } from '@/features/worker/repository/workerRepository';
import { Worker, AttendanceRecord, AttendanceCorrection, PunchType } from '@/features/attendance/domain/types';

export interface PunchCorrectionInput {
  workerId: string;
  punchType: PunchType;
  punchedAt: string; // ISO String
  reason: string;
  attendanceId?: string; // 既存打刻レコードID (修正時)
  correctedBy: string; // user_id
  contractorId: string;
}

export class PunchCorrectionUseCase {
  constructor(
    private attendanceRepo: IAttendanceRepository,
    private workerRepo: IWorkerRepository
  ) {}

  public async getWorkers(contractorId: string): Promise<Worker[]> {
    return await this.workerRepo.getByContractor(contractorId);
  }

  public async getExistingAttendance(attendanceId: string): Promise<AttendanceRecord | null> {
    return await this.attendanceRepo.getRecordById(attendanceId);
  }

  public async submitCorrection(input: PunchCorrectionInput): Promise<{ success: boolean; correctionId: string }> {
    const correctionId = this.attendanceRepo.generateId('COR');
    const nowISO = new Date().toISOString();

    let beforeRecord: Partial<AttendanceRecord> | undefined = undefined;

    if (input.attendanceId) {
      // 既存レコード修正
      const existing = await this.attendanceRepo.getRecordById(input.attendanceId);
      if (existing) {
        beforeRecord = { ...existing };
        
        // 元レコードを更新
        const updatedRecord: AttendanceRecord = {
          ...existing,
          worker_id: input.workerId,
          punch_type: input.punchType,
          clocked_at: input.punchedAt,
        };
        await this.attendanceRepo.saveRecord(updatedRecord);
      }
    } else {
      // 新規手動打刻登録
      const newAttendanceId = this.attendanceRepo.generateId('ATT');
      const newRecord: AttendanceRecord = {
        attendance_id: newAttendanceId,
        worker_id: input.workerId,
        contractor_id: input.contractorId,
        punch_type: input.punchType,
        clocked_at: input.punchedAt,
        punched_by: input.correctedBy,
        photo_object_id: '', // 手動登録時は写真なし
        created_at: nowISO,
      };
      await this.attendanceRepo.saveRecord(newRecord);
      input.attendanceId = newAttendanceId;
    }

    // 修正・手動登録履歴の保存
    const correction: AttendanceCorrection = {
      correction_id: correctionId,
      attendance_id: input.attendanceId,
      corrected_by: input.correctedBy,
      reason: input.reason,
      before: beforeRecord,
      after: {
        worker_id: input.workerId,
        punch_type: input.punchType,
        clocked_at: input.punchedAt,
      },
      corrected_at: nowISO,
    };

    await this.attendanceRepo.saveCorrection(correction);

    return {
      success: true,
      correctionId,
    };
  }
}

export const punchCorrectionUseCase = new PunchCorrectionUseCase(attendanceRepository, workerRepository);