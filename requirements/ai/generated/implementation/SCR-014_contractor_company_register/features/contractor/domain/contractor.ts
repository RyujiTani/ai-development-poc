export type Status = 'ACTIVE' | 'INACTIVE';

export interface Contractor {
  contractor_id: string;          // UUID
  name: string;
  status: Status;
  created_at: string;             // ISO8601
  updated_at: string;
}