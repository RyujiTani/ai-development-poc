import { NextResponse } from 'next/server';
import { LaborSummaryRepository } from '@/features/report/repository/laborSummaryRepository';
import { GetLaborSummaryUseCase } from '@/features/report/usecase/getLaborSummaryUseCase';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get('start_date') || '';
  const endDate = searchParams.get('end_date') || '';
  const unit = (searchParams.get('unit') || 'daily') as 'daily' | 'monthly';

  const repository = new LaborSummaryRepository();
  const useCase = new GetLaborSummaryUseCase(repository);

  try {
    const data = await useCase.execute(startDate, endDate, unit);
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}