import * as XLSX from 'xlsx';

export interface ExportColumn {
  header: string;
  key: string;
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportToCSV(
  rows: Record<string, unknown>[],
  filename: string,
  columns: ExportColumn[]
) {
  const header = columns.map((c) => `"${c.header}"`).join(',');
  const body = rows
    .map((row) =>
      columns
        .map((c) => `"${String(row[c.key] ?? '').replace(/"/g, '""')}"`)
        .join(',')
    )
    .join('\n');
  const csv = `${header}\n${body}`;
  triggerDownload(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), `${filename}.csv`);
}

export function exportToXLSX(
  rows: Record<string, unknown>[],
  filename: string,
  sheetName: string,
  columns: ExportColumn[]
) {
  const wsData = rows.map((row) => {
    const obj: Record<string, unknown> = {};
    columns.forEach((c) => {
      obj[c.header] = row[c.key] ?? '';
    });
    return obj;
  });
  const ws = XLSX.utils.json_to_sheet(wsData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

export async function exportToPDF(
  rows: Record<string, unknown>[],
  filename: string,
  title: string,
  columns: ExportColumn[]
) {
  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const doc = new jsPDF({ orientation: columns.length > 6 ? 'landscape' : 'portrait' });
  doc.setFontSize(16);
  doc.setTextColor(30, 64, 175);
  doc.text('Warehouse HQ', 14, 15);
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(13);
  doc.text(title, 14, 23);
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30);

  autoTable(doc, {
    head: [columns.map((c) => c.header)],
    body: rows.map((row) => columns.map((c) => String(row[c.key] ?? ''))),
    startY: 35,
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [29, 78, 216], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 14, right: 14 },
  });

  doc.save(`${filename}.pdf`);
}

export function exportRows(
  rows: Record<string, unknown>[],
  baseName: string,
  title: string,
  columns: ExportColumn[],
  format: 'csv' | 'xlsx' | 'pdf'
) {
  const date = new Date().toISOString().slice(0, 10);
  const filename = `${baseName}-${date}`;
  if (format === 'csv') exportToCSV(rows, filename, columns);
  else if (format === 'xlsx') exportToXLSX(rows, filename, title, columns);
  else exportToPDF(rows, filename, title, columns);
}
