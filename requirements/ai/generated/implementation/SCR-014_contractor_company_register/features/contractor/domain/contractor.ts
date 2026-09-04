export type Status = 'ACTIVE' | 'INACTIVE' | 'RETIRED' | 'LOCKED' | 'DISABLED';
export type Role = 'FACTORY_ADMIN' | 'CONTRACTOR_MANAGER';

export interface Contractor {
  contractor_id: string;          // UUID
  name: string;
  status: Extract<Status, 'ACTIVE' | 'INACTIVE'>;
  created_at: string;             // ISO8601
  updated_at: string;
}