export type Role = 'FACTORY_ADMIN' | 'CONTRACTOR_MANAGER';
export type PunchType = 'CLOCK_IN' | 'CLOCK_OUT';
export type Status = 'ACTIVE' | 'INACTIVE' | 'RETIRED' | 'LOCKED' | 'DISABLED';

export interface User {
  user_id: string;
  contractor_id: string | null;   // null = 工場側管理者
  role: Role;
  login_id: string;
  password_hash: string;          // モック認証用（平文を格納するが変数名はpassword_hashとする）
  display_name: string;
  status: Extract<Status, 'ACTIVE' | 'LOCKED' | 'DISABLED'>;
  last_login_at?: string;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  audit_id: string;
  occurred_at: string;
  actor_user_id?: string;
  actor_role?: Role;
  action: string;                 // LOGIN / CREATE_WORKER / PUNCH / CORRECT_PUNCH ...
  target_type?: string;
  target_id?: string;
  detail?: Record<string, unknown>;
}