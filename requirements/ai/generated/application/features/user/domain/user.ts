export type Role = 'FACTORY_ADMIN' | 'CONTRACTOR_MANAGER';
export type Status = 'ACTIVE' | 'INACTIVE' | 'RETIRED' | 'LOCKED' | 'DISABLED';

export interface User {
  user_id: string;
  contractor_id: string | null;   // null = 工場側管理者
  role: Role;
  login_id: string;
  password_hash: string;          // モックでも平文保存はしない（簡易ハッシュ可）
  display_name: string;
  status: Extract<Status, 'ACTIVE' | 'LOCKED' | 'DISABLED'>;
  last_login_at?: string;
  created_at: string;
  updated_at: string;
}