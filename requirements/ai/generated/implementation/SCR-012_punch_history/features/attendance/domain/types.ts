export type PunchType = 'CLOCK_IN' | 'CLOCK_OUT';

export type Role = 'FACTORY_ADMIN' | 'CONTRACTOR_MANAGER';

export type Status = 'ACTIVE' | 'INACTIVE' | 'RETIRED' | 'LOCKED' | 'DISABLED';

export interface AttendanceRecord {
  attendance_id: string;
  worker_id: string;
  contractor_id: string;
  punch_type: PunchType;
  clocked_at: string;             // ISO8601
  punched_by: string;             // user_id
  geo?: { lat: number; lng: number };
  photo_object_id: string;
  created_at: string;
}

export interface AttendanceCorrection {
  correction_id: string;
  attendance_id?: string;         // 新規登録時 undefined
  corrected_by: string;
  reason: string;                 // 必須
  before?: Partial<AttendanceRecord>;
  after: Partial<AttendanceRecord>;
  corrected_at: string;
}

export interface PhotoBlob {
  photo_object_id: string;
  blob: Blob;                     // IndexedDB に Blob 直接保存
  content_type: string;
  byte_size: number;
  uploaded_by: string;
  uploaded_at: string;
}