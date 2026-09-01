export interface LaborSummaryRecord {
  worker_id: string;
  worker_name: string;
  contractor_name: string;
  period: string;                 // YYYY-MM-DD（日次） または YYYY-MM（月次）
  total_hours: number;
}
"
    },
    {