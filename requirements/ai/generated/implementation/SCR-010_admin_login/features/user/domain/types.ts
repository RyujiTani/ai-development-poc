export type Role = 'FACTORY_ADMIN' | 'CONTRACTOR_MANAGER';
export type Status = 'ACTIVE' | 'INACTIVE' | 'RETIRED' | 'LOCKED' | 'DISABLED';

export interface User {
  user_id: string;
  contractor_id: string | null;   // null = 工場側管理者
  role: Role;
  login_id: string;
  password_hash: string;          // 簡易ハッシュ
  display_name: string;
  status: Extract<Status, 'ACTIVE' | 'LOCKED' | 'DISABLED'>;
  last_login_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Contractor {
  contractor_id: string;          // UUID
  name: string;
  status: Extract<Status, 'ACTIVE' | 'INACTIVE'>;
  created_at: string;             // ISO8601
  updated_at: string;
}
"
    },
    {