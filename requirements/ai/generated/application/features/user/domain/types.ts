export type Role = 'FACTORY_ADMIN' | 'CONTRACTOR_MANAGER';

export type Status = 'ACTIVE' | 'INACTIVE' | 'RETIRED' | 'LOCKED' | 'DISABLED';

export interface User {
  user_id: string;
  contractor_id: string | null; // null = 工場側管理者
  role: Role;
  login_id: string;
  password_hash: string; // 簡易Base64ハッシュ
  display_name: string;
  status: Extract<Status, 'ACTIVE' | 'LOCKED' | 'DISABLED'>;
  last_login_at?: string;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  audit_id: string;
  occurred_at: string;
  actor_user_id: string | null;
  actor_role: Role | null;
  action: string;
  target_type?: string;
  target_id?: string;
  detail?: Record<string, unknown>;
}