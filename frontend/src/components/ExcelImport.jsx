import React, { useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { Upload, Download, FileSpreadsheet, RefreshCw, Trash2, Plus } from 'lucide-react';
import { matchExistingRecords } from '../utils/importMatch';

let nextFileId = 1;

/**
 * ExcelImport
 * Props:
 *   onImport(rows)        — called once with the combined array of parsed row objects
 *                            from every staged file (rows may carry `_id` when matched
 *                            against an existing record — see matchKey below)
 *   columns                — [{ key, label, type: 'string'|'number'|'date' }]
 *   templateName            — filename for the downloaded template (without extension)
 *   matchKey (optional)     — field name(s) to match rows against existingRecords so a
 *                            "Replace existing entries" option can update instead of
 *                            duplicate. String or array of strings, tried in order.
 *   existingRecords (opt.)  — already-loaded records to match against (needs matchKey)
 */
export default function ExcelImport({ onImport, columns = [], templateName = 'template', matchKey, existingRecords }) {
  const [open, setOpen]                 = useState(false);
  const [files, setFiles]               = useState([]); // [{ id, name, rows, skipped }]
  const [replaceExisting, setReplaceExisting] = useState(false);
  const fileRef                         = useRef();
  const replaceIdRef                    = useRef(null); // set when the picker is replacing a staged file

  const keyFields = matchKey ? (Array.isArray(matchKey) ? matchKey : [matchKey]) : null;
  const canReplace = !!(keyFields && existingRecords);

  /* ---- Template download ---- */
  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([columns.map((c) => c.label)]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, `${templateName}.xlsx`);
  };

  /* ---- Parse one File into { rows, skipped } ---- */
  function parseFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = new Uint8Array(ev.target.result);
          const wb   = XLSX.read(data, { type: 'array', cellDates: true });
          const ws   = wb.Sheets[wb.SheetNames[0]];
          const raw  = XLSX.utils.sheet_to_json(ws, { defval: '' });

          const labelToKey = {};
          columns.forEach((col) => { labelToKey[col.label.toLowerCase()] = col; });

          const rows = [];
          let skipped = 0;

          raw.forEach((rawRow) => {
            const row = {};
            Object.keys(rawRow).forEach((header) => {
              const colDef = labelToKey[header.toLowerCase().trim()];
              if (!colDef) return;
              const val = rawRow[header];
              if (colDef.type === 'number') {
                row[colDef.key] = parseFloat(val) || 0;
              } else if (colDef.type === 'date') {
                row[colDef.key] = val instanceof Date ? val.toISOString().split('T')[0] : String(val || '');
              } else {
                row[colDef.key] = String(val ?? '');
              }
            });

            const firstKey = columns[0]?.key;
            if (!firstKey || !row[firstKey]) { skipped++; return; }
            rows.push(row);
          });

          resolve({ rows, skipped });
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(reader.error || new Error('Could not read file'));
      reader.readAsArrayBuffer(file);
    });
  }

  /* ---- File picker handler — appends, or replaces one staged slot ---- */
  const handleFiles = async (e) => {
    const picked = Array.from(e.target.files || []);
    e.target.value = ''; // allow re-selecting the same file name
    if (!picked.length) return;

    const parsed = await Promise.all(picked.map(async (file) => {
      try {
        const { rows, skipped } = await parseFile(file);
        return { id: nextFileId++, name: file.name, rows, skipped };
      } catch (err) {
        return { id: nextFileId++, name: file.name, rows: [], skipped: 0, error: err.message };
      }
    }));

    setFiles((prev) => {
      if (replaceIdRef.current != null) {
        const idx = prev.findIndex((f) => f.id === replaceIdRef.current);
        if (idx === -1) return [...prev, ...parsed];
        const next = [...prev];
        next.splice(idx, 1, ...parsed);
        return next;
      }
      return [...prev, ...parsed];
    });
    replaceIdRef.current = null;
  };

  const triggerAdd = () => { replaceIdRef.current = null; fileRef.current?.click(); };
  const triggerReplace = (id) => { replaceIdRef.current = id; fileRef.current?.click(); };
  const removeFile = (id) => setFiles((prev) => prev.filter((f) => f.id !== id));

  const allRows    = files.flatMap((f) => f.rows);
  const totalSkipped = files.reduce((s, f) => s + f.skipped, 0);
  const previewRows = allRows.slice(0, 5);

  const handleImport = () => {
    if (!allRows.length) return;
    const rows = replaceExisting && canReplace
      ? matchExistingRecords(allRows, existingRecords, keyFields)
      : allRows;
    onImport(rows);
    handleClose();
  };

  const handleClose = () => {
    setOpen(false);
    setFiles([]);
    setReplaceExisting(false);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 border border-gray-300 text-gray-700 px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 shrink-0"
      >
        <Upload size={15} /> Import Excel/CSV
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl my-4">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <FileSpreadsheet size={18} className="text-green-600" />
                <h2 className="font-bold text-gray-800">Import from Excel / CSV</h2>
              </div>
              <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
            </div>

            <div className="p-5 space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-blue-800">Step 1 — Download the template</p>
                  <p className="text-xs text-blue-600 mt-0.5">Fill in your data then upload it below. Do not rename the column headers.</p>
                </div>
                <button onClick={downloadTemplate}
                  className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 shrink-0">
                  <Download size={14} /> Download Template
                </button>
              </div>

              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">Step 2 — Upload your file(s)</p>

                {files.length === 0 ? (
                  <div
                    className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center cursor-pointer hover:border-primary-900/40 transition-colors"
                    onClick={triggerAdd}
                  >
                    <Upload size={24} className="mx-auto mb-2 text-gray-300" />
                    <p className="text-sm text-gray-500">Click to select one or more files</p>
                    <p className="text-xs text-gray-400 mt-0.5">Accepts .xlsx, .xls, .csv</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {files.map((f) => (
                      <div key={f.id} className="flex items-center gap-3 border border-gray-200 rounded-xl px-3 py-2.5">
                        <FileSpreadsheet size={16} className="text-green-600 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-700 truncate">{f.name}</p>
                          <p className="text-xs text-gray-400">
                            {f.error ? <span className="text-red-500">{f.error}</span> : `${f.rows.length} row${f.rows.length !== 1 ? 's' : ''} ready${f.skipped ? ` · ${f.skipped} skipped` : ''}`}
                          </p>
                        </div>
                        <button type="button" onClick={() => triggerReplace(f.id)} title="Replace this file"
                          className="p-1.5 text-gray-400 hover:text-primary-900 hover:bg-gray-50 rounded-lg shrink-0">
                          <RefreshCw size={14} />
                        </button>
                        <button type="button" onClick={() => removeFile(f.id)} title="Remove this file"
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg shrink-0">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                    <button type="button" onClick={triggerAdd}
                      className="flex items-center gap-1.5 text-xs font-medium text-primary-900 hover:underline pt-1">
                      <Plus size={13} /> Add more files
                    </button>
                  </div>
                )}
                <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" multiple className="hidden" onChange={handleFiles} />
              </div>

              {canReplace && files.length > 0 && (
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={replaceExisting} onChange={(e) => setReplaceExisting(e.target.checked)}
                    className="rounded border-gray-300 text-primary-900 focus:ring-primary-900/30" />
                  Replace existing entries that match (otherwise every row is added as new)
                </label>
              )}

              {files.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-2">
                    Preview — {allRows.length} row{allRows.length !== 1 ? 's' : ''} ready across {files.length} file{files.length !== 1 ? 's' : ''}
                    {totalSkipped > 0 && <span className="ml-2 text-xs text-amber-600 font-normal">({totalSkipped} skipped — missing required field)</span>}
                  </p>
                  {previewRows.length > 0 ? (
                    <div className="overflow-x-auto border border-gray-100 rounded-xl">
                      <table className="w-full text-xs min-w-[400px]">
                        <thead className="bg-gray-50 border-b border-gray-100">
                          <tr>
                            {columns.map((c) => (
                              <th key={c.key} className="text-left px-3 py-2 font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{c.label}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {previewRows.map((row, i) => (
                            <tr key={i} className="hover:bg-gray-50">
                              {columns.map((c) => (
                                <td key={c.key} className="px-3 py-2 text-gray-700 whitespace-nowrap max-w-[160px] truncate">{row[c.key] ?? '—'}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {allRows.length > 5 && (
                        <p className="text-xs text-gray-400 px-3 py-2 border-t border-gray-100">… and {allRows.length - 5} more row{allRows.length - 5 !== 1 ? 's' : ''}</p>
                      )}
                    </div>
                  ) : (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700">
                      No valid rows found. Make sure the column headers match the template exactly.
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={handleClose}
                  className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                  Cancel
                </button>
                <button type="button" onClick={handleImport} disabled={!allRows.length}
                  className="flex-1 bg-primary-900 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-primary-800 disabled:opacity-40">
                  {allRows.length ? `Import ${allRows.length} row${allRows.length !== 1 ? 's' : ''}` : 'Import'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
