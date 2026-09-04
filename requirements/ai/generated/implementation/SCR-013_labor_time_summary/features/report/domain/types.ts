export interface LaborSummaryRow {
  workerId: string;
  workerName: string;
  contractorId: string;
  contractorName: string;
  dateOrMonth: string; // "YYYY-MM-DD" or "YYYY-MM"
  totalHours: number;
}