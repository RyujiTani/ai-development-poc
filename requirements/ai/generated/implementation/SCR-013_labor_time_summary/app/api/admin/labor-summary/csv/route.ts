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
    
    const header = ['作業員名', '外注先企業', unit === 'daily' ? '日付' : '対象月', '実労働時間(時間)'];
    const rows = data.map(r => [
      r.workerName,
      r.contractorName,
      r.dateOrMonth,
      r.totalHours.toFixed(1)
    ]);

    const csvContent = [
      header.join(','),
      ...rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
    ].join('\r\n');

    const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
    const blob = new Blob([bom, csvContent], { type: 'text/csv;charset=utf-8;' });

    return new Response(blob, {
      headers: {
        'Content-Type': 'text/csv;charset=utf-8;',
        'Content-Disposition': `attachment; filename="labor_summary_${unit}_${startDate}_${endDate}.csv"`,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}