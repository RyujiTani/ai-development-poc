import { LaborSummaryRecord } from '@/features/report/domain/laborSummary';

export function exportLaborSummaryToCSV(data: LaborSummaryRecord[], unit: 'daily' | 'monthly'): void {
  const header = [
    '対象期間',
    '外注先企業名',
    '作業員名',
    '労働時間（時間）'
  ];

  const rows = data.map(item => [
    item.period,
    item.contractor_name,
    item.worker_name,
    item.total_hours.toFixed(2)
  ]);

  const csvContent = [header, ...rows]
    .map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
  const blob = new Blob([bom, csvContent], { type: 'text/csv;charset=utf-8;' });
  
  const link = document.createElement('a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    link.setAttribute('href', url);
    link.setAttribute('download', `labor_summary_${todayStr}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
"
    },
    {