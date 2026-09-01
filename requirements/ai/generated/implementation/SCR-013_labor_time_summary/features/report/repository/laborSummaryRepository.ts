import { LaborSummaryRecord } from '../domain/laborSummary';

export interface LaborSummaryRepository {
  getSummary(startDate: string, endDate: string, unit: 'daily' | 'monthly'): Promise<LaborSummaryRecord[]>;
}
"
    },
    {