export function exportLaborSummaryToCSV(data: any[], filename = 'labor_summary.csv'): void {
  const headers = ['集計期間', '外注先名', '作業員名', '合計労働時間 (時間)'];

  const escapeCsvCell = (val: any): string => {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const headerLine = headers.join(',');
  const rows = data.map(item => {
    return [
      escapeCsvCell(item.period),
      escapeCsvCell(item.contractor_name),
      escapeCsvCell(item.worker_name),
      escapeCsvCell(item.total_hours)
    ].join(',');
  });

  const csvString = [headerLine, ...rows].join('\r\n');

  // UTF-8 BOM付きでExcel文字化けを防止
  const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
  const blob = new Blob([bom, csvString], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}