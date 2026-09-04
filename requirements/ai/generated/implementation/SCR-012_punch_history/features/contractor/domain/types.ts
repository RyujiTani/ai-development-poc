import { Status } from '../domain/types';

export interface Contractor {
  contractor_id: string;          // UUID
  name: string;
  status: Extract<Status, 'ACTIVE' | 'INACTIVE'>;
  created_at: string;             // ISO8601
  updated_at: string;
}