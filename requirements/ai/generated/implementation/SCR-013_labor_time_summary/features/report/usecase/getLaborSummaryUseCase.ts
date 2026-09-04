import { ILaborSummaryRepository } from '../repository/laborSummaryRepository';
import { LaborSummaryRow } from '../domain/types';

export class GetLaborSummaryUseCase {
  constructor(private repository: ILaborSummaryRepository) {}

  async execute(startDate: string, endDate: string, unit: 'daily' | 'monthly'): Promise<LaborSummaryRow[]> {
    if (!startDate) {
      throw new Error('開始日を入力してください');
    }
    if (!endDate) {
      throw new Error('終了日を入力してください');
    }
    if (new Date(startDate) > new Date(endDate)) {
      throw new Error('終了日は開始日以降の日付を指定してください');
    }

    return await this.repository.getSummary(startDate, endDate, unit);
  }
}