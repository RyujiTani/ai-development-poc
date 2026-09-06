import { AttendanceRecord } from "./AttendanceRecord";

export interface AttendanceCorrection {
  correction_id: string;
  attendance_id?: string;         // 新規登録時 undefined
  corrected_by: string;
  reason: string;                 // 必須
  before?: Partial<AttendanceRecord>;
  after: Partial<AttendanceRecord>;
  corrected_at: string;
}