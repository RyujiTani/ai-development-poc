export interface Contractor {
  contractor_id: string;          // UUID
  name: string;
  status: 'ACTIVE' | 'INACTIVE';
  created_at: string;             // ISO8601
  updated_at: string;
}