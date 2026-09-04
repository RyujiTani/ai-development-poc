export type Role = 'FACTORY_ADMIN' | 'CONTRACTOR_MANAGER';
export type PunchType = 'CLOCK_IN' | 'CLOCK_OUT';
export type Status = 'ACTIVE' | 'INACTIVE' | 'RETIRED' | 'LOCKED' | 'DISABLED';

export interface Contractor {
  contractor_id: string;          // UUID
  name: string;
  status: Extract<Status, 'ACTIVE' | 'INACTIVE'>;
  created_at: string;             // ISO8601
  updated_at: string;
}

export interface User {
  user_id: string;
  contractor_id: string | null;   // null = 工場側管理者
  role: Role;
  login_id: string;
  password_hash: string;          // モック用簡易ハッシュ
  display_name: string;
  status: Extract<Status, 'ACTIVE' | 'LOCKED' | 'DISABLED'>;
  last_login_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Worker {
  worker_id: string;
  contractor_id: string;
  name: string;
  contact?: string;
  qualifications: string[];       // 資格コード配列
  trainings: Array<{ code: string; taken_at: string }>;
  status: Extract<Status, 'ACTIVE' | 'RETIRED'>;
  retired_at?: string;
  created_at: string;
  updated_at: string;
}

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
  attendance_id?: string;         // 新規手動登録時は undefined もしくは null
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

export interface AuditLog {
  audit_id: string;
  occurred_at: string;
  actor_user_id?: string;
  actor_role?: Role;
  action: string;                 // LOGIN / CREATE_WORKER / PUNCH / CORRECT_PUNCH
  target_type?: string;
  target_id?: string;
  detail?: Record<string, unknown>;
}