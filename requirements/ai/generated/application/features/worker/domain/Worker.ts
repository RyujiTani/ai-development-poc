export interface Worker {
  worker_id: string;
  contractor_id: string;
  name: string;
  contact?: string;
  qualifications: string[];
  trainings: Array<{ code: string; taken_at: string }>;
  status: "ACTIVE" | "RETIRED";
  retired_at?: string;
  created_at: string;
  updated_at: string;
}