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
  password_hash: string;          // 簡易ハッシュまたは平文
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

export const QUALIFICATIONS_MAP: Record<string, string> = {
  Q01: 'フォークリフト運転技能講習',
  Q02: '玉掛け技能講習',
  Q03: '足場の組立て等特別教育',
  Q04: '高所作業車運転業務特別教育',
};

export const TRAININGS_MAP: Record<string, string> = {
  T01: '新規入場者教育',
  T02: '職長・安全衛生責任者教育',
  T03: '特別安全教育',
};