export type PunchType = 'CLOCK_IN' | 'CLOCK_OUT';

export interface AttendanceRecord {
  attendance_id: string;
  worker_id: string;
  contractor_id: string;
  punch_type: PunchType;
  clocked_at: string; // ISO8601
  punched_by: string; // user_id
  photo_object_id: string;
  created_at: string;
}

export interface AttendanceCorrection {
  correction_id: string;
  attendance_id?: string;
  corrected_by: string;
  reason: string; // 必須
  before?: Partial<AttendanceRecord>;
  after: Partial<AttendanceRecord>;
  corrected_at: string;
}
