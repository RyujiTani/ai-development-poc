export function downloadCSV(filename: string, header: string[], rows: string[][]) {
  const csvContent = [
    header.join(','),
    ...rows.map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(','))
  ].join('\n');

  // Excel等で開いても文字化けしないようにBOM付きUTF-8にする
  const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}