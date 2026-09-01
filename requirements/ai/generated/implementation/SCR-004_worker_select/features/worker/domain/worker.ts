export type Role = 'FACTORY_ADMIN' | 'CONTRACTOR_MANAGER';
export type PunchType = 'CLOCK_IN' | 'CLOCK_OUT';
export type Status = 'ACTIVE' | 'INACTIVE' | 'RETIRED' | 'LOCKED' | 'DISABLED';

export interface Worker {
  worker_id: string;
  contractor_id: string;
  name: string;
  contact?: string;
  qualifications: string[];
  trainings: Array<{ code: string; taken_at: string }>;
  status: 'ACTIVE' | 'RETIRED';
  retired_at?: string;
  created_at: string;
  updated_at: string;
}

export interface AttendanceRecord {
  attendance_id: string;
  worker_id: string;
  contractor_id: string;
  punch_type: PunchType;
  clocked_at: string;
  punched_by: string;
  geo?: { lat: number; lng: number };
  photo_object_id: string;
  created_at: string;
}

export interface Contractor {
  contractor_id: string;
  name: string;
  status: 'ACTIVE' | 'INACTIVE';
  created_at: string;
  updated_at: string;
}

export interface User {
  user_id: string;
  contractor_id: string | null;
  role: Role;
  login_id: string;
  password_hash: string;
  display_name: string;
  status: 'ACTIVE' | 'LOCKED' | 'DISABLED';
  last_login_at?: string;
  created_at: string;
  updated_at: string;
}
