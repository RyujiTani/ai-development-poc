import { DashboardData } from '../domain/dashboard';
import { DashboardRepository } from '../repository/dashboardRepository';

export class GetDashboardDataUseCase {
  constructor(private dashboardRepository: DashboardRepository) {}

  async execute(): Promise<DashboardData> {
    return this.dashboardRepository.getDashboardData();
  }
}