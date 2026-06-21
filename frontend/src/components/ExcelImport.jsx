import React, { useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { Upload, Download, X, FileSpreadsheet } from 'lucide-react';

/**
 * ExcelImport
 * Props:
 *   onImport(rows)   — called with array of parsed row objects
 *   columns          — [{ key, label, type: 'string'|'number'|'date' }]
 *   templateName     — filename for the downloaded template (without extension)
 */
export default function ExcelImport({ onImport, columns = [], templateName = 'template' }) {
  const [open, setOpen]         = useState(false);
  const [preview, setPreview]   = useState(null); // { rows, skipped }
  const [fileName, setFileName] = useState('');
  const fileRef                 = useRef();

  /* ---- Template download ---- */
  const downloadTemplate = () => {
    const ws   = XLSX.utils.aoa_to_sheet([columns.map((c) => c.label)]);
    const wb   = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, `${templateName}.xlsx`);
  };

  /* ---- File parsing ---- */
  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const data = new Uint8Array(ev.target.result);
      const wb   = XLSX.read(data, { type: 'array', cellDates: true });
      const ws   = wb.Sheets[wb.SheetNames[0]];
      const raw  = XLSX.utils.sheet_to_json(ws, { defval: '' });

      // Build a header → column.key map (case-insensitive)
      const labelToKey = {};
      columns.forEach((col) => {
        labelToKey[col.label.toLowerCase()] = col;
      });

      const rows    = [];
      let   skipped = 0;

      raw.forEach((rawRow) => {
        const row = {};
        // Map each raw header to the expected key
        Object.keys(rawRow).forEach((header) => {
          const colDef = labelToKey[header.toLowerCase().trim()];
          if (!colDef) return;
          const val = rawRow[header];
          if (colDef.type === 'number') {
            row[colDef.key] = parseFloat(val) || 0;
          } else if (colDef.type === 'date') {
            // If xlsx parsed it as a Date object, convert to ISO string
            if (val instanceof Date) {
              row[colDef.key] = val.toISOString().split('T')[0];
            } else {
              row[colDef.key] = String(val || '');
            }
          } else {
            row[colDef.key] = String(val ?? '');
          }
        });

        // Check required fields (first column is always required)
        const firstKey = columns[0]?.key;
        if (!firstKey || !row[firstKey]) {
          skipped++;
          return;
        }

        rows.push(row);
      });

      setPreview({ rows, skipped });
    };
    reader.readAsArrayBuffer(file);
    // Reset input so same file can be re-selected
    e.target.value = '';
  };

  const handleImport = () => {
    if (preview?.rows?.length) {
      onImport(preview.rows);
    }
    handleClose();
  };

  const handleClose = () => {
    setOpen(false);
    setPreview(null);
    setFileName('');
  };

  const previewRows = preview?.rows?.slice(0, 5) ?? [];

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 border border-gray-300 text-gray-700 px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 shrink-0"
      >
        <Upload size={15} /> Import Excel/CSV
      </button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl my-4">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <FileSpreadsheet size={18} className="text-green-600" />
                <h2 className="font-bold text-gray-800">Import from Excel / CSV</h2>
              </div>
              <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
            </div>

            <div className="p-5 space-y-4">
              {/* Step 1 — Download template */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-blue-800">Step 1 — Download the template</p>
                  <p className="text-xs text-blue-600 mt-0.5">Fill in your data then upload it below. Do not rename the column headers.</p>
                </div>
                <button
                  onClick={downloadTemplate}
                  className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 shrink-0"
                >
                  <Download size={14} /> Download Template
                </button>
              </div>

              {/* Step 2 — Upload file */}
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">Step 2 — Upload your file</p>
                <div
                  className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center cursor-pointer hover:border-primary-900/40 transition-colors"
                  onClick={() => fileRef.current?.click()}
                >
                  <Upload size={24} className="mx-auto mb-2 text-gray-300" />
                  {fileName ? (
                    <p className="text-sm font-medium text-gray-700">{fileName}</p>
                  ) : (
                    <>
                      <p className="text-sm text-gray-500">Click to select a file</p>
                      <p className="text-xs text-gray-400 mt-0.5">Accepts .xlsx, .xls, .csv</p>
                    </>
                  )}
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={handleFile}
                />
              </div>

              {/* Preview */}
              {preview && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-gray-700">
                      Preview — {preview.rows.length} row{preview.rows.length !== 1 ? 's' : ''} ready
                      {preview.skipped > 0 && (
                        <span className="ml-2 text-xs text-amber-600 font-normal">
                          ({preview.skipped} skipped — missing required field)
                        </span>
                      )}
                    </p>
                    <button onClick={() => { setPreview(null); setFileName(''); }} className="text-gray-400 hover:text-gray-600">
                      <X size={14} />
                    </button>
                  </div>

                  {previewRows.length > 0 ? (
                    <div className="overflow-x-auto border border-gray-100 rounded-xl">
                      <table className="w-full text-xs min-w-[400px]">
                        <thead className="bg-gray-50 border-b border-gray-100">
                          <tr>
                            {columns.map((c) => (
                              <th key={c.key} className="text-left px-3 py-2 font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                                {c.label}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {previewRows.map((row, i) => (
                            <tr key={i} className="hover:bg-gray-50">
                              {columns.map((c) => (
                                <td key={c.key} className="px-3 py-2 text-gray-700 whitespace-nowrap max-w-[160px] truncate">
                                  {row[c.key] ?? '—'}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {preview.rows.length > 5 && (
                        <p className="text-xs text-gray-400 px-3 py-2 border-t border-gray-100">
                          … and {preview.rows.length - 5} more row{preview.rows.length - 5 !== 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700">
                      No valid rows found. Make sure the column headers match the template exactly.
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleImport}
                  disabled={!preview?.rows?.length}
                  className="flex-1 bg-primary-900 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-primary-800 disabled:opacity-40"
                >
                  {preview?.rows?.length ? `Import ${preview.rows.length} row${preview.rows.length !== 1 ? 's' : ''}` : 'Import'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
