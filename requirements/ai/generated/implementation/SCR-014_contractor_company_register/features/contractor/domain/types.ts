// trace: SCR-014-DT-002
export type Role = 'FACTORY_ADMIN' | 'CONTRACTOR_MANAGER';
export type Status = 'ACTIVE' | 'INACTIVE' | 'RETIRED' | 'LOCKED' | 'DISABLED';

export interface Contractor {
  contractor_id: string;          // UUID
  name: string;
  status: 'ACTIVE' | 'INACTIVE';
  created_at: string;             // ISO8601
  updated_at: string;
}
"
    },
    {