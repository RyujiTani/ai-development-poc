export type Role = 'FACTORY_ADMIN' | 'CONTRACTOR_MANAGER';
export type Status = 'ACTIVE' | 'INACTIVE' | 'RETIRED' | 'LOCKED' | 'DISABLED';

export interface Worker {
  worker_id: string;
  contractor_id: string;
  name: string;
  contact?: string;
  qualifications: string[];       // 資格コード配列
  trainings: Array<{ code: string; taken_at: string }>;
  status: 'ACTIVE' | 'RETIRED';
  retired_at?: string;
  created_at: string;
  updated_at: string;
}
"
    },
    {