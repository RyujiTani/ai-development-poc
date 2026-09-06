export type Role = 'FACTORY_ADMIN' | 'CONTRACTOR_MANAGER';
export type Status = 'ACTIVE' | 'LOCKED' | 'DISABLED';

export interface User {
  user_id: string;
  contractor_id: string | null;   // null = 工場側管理者
  role: Role;
  login_id: string;
  password_hash: string;
  display_name: string;
  status: Status;
  last_login_at?: string;
  created_at: string;
  updated_at: string;
}