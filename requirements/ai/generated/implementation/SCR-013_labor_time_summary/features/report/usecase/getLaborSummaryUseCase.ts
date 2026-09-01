import { LaborSummaryRepository } from '../repository/laborSummaryRepository';
import { LaborSummaryRecord } from '../domain/laborSummary';

export class GetLaborSummaryUseCase {
  constructor(private repository: LaborSummaryRepository) {}

  async execute(startDate: string, endDate: string, unit: 'daily' | 'monthly'): Promise<LaborSummaryRecord[]> {
    if (!startDate) {
      throw new Error('開始日は必須項目です');
    }
    if (!endDate) {
      throw new Error('終了日は必須項目です');
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new Error('無効な日付形式です');
    }
    if (end < start) {
      throw new Error('終了日は開始日以降の日付を指定してください');
    }

    return this.repository.getSummary(startDate, endDate, unit);
  }
}
"
    },
    {