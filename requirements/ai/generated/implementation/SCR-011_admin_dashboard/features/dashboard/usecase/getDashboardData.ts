import { DashboardRepository, DashboardData } from '../repository/dashboardRepository';

export type AppError = {
  code: string;
  message: string;
};

export type Result<T, E = AppError> = 
  | { success: true; data: T }
  | { success: false; error: E };

export class GetDashboardDataUseCase {
  constructor(private dashboardRepository: DashboardRepository) {}

  async execute(): Promise<Result<DashboardData>> {
    try {
      const data = await this.dashboardRepository.getDashboardData();
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'DASHBOARD_FETCH_FAILED',
          message: error instanceof Error ? error.message : 'ダッシュボードデータの取得に失敗しました。'
        }
      };
    }
  }
}
"
    },
    {