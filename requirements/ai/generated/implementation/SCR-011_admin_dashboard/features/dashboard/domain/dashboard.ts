export interface ContractorBreakdown {
  contractor_id: string;
  name: string;
  active_count: number;
}

export interface DashboardSummary {
  total_active_workers: number;
  clocked_in_today: number;
  contractor_breakdown: ContractorBreakdown[];
}

export interface DashboardAlert {
  alert_id: string;
  level: 'info' | 'warning' | 'error';
  message: string;
  occurred_at: string;
}

export interface DashboardData {
  summary: DashboardSummary;
  alerts: DashboardAlert[];
}