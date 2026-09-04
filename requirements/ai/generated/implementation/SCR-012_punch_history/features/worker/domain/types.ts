import { Status } from '../../attendance/domain/types';

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