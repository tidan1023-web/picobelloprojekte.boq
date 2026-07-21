import React, { useEffect, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { Upload, Download, FileSpreadsheet, RefreshCw, Trash2, Plus, AlertTriangle } from 'lucide-react';
import { matchExistingRecords } from '../utils/importMatch';
import { autoMatchColumns } from '../utils/columnMatch';
import { matchEnumValue } from '../utils/enumMatch';

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
 *
 * Column headers in the uploaded file don't need to match our template exactly —
 * they're auto-matched by similarity, and the user can review/correct the mapping
 * before anything is parsed into rows. This is what makes a QS's own spreadsheet
 * (different wording, different column order) still import correctly.
 */
export default function ExcelImport({ onImport, columns = [], templateName = 'template', matchKey, existingRecords }) {
  const [open, setOpen]                 = useState(false);
  const [files, setFiles]               = useState([]); // [{ id, name, headers, raw }]
  const [mapping, setMapping]           = useState({}); // { columnKey: header|null }
  const [replaceExisting, setReplaceExisting] = useState(false);
  const fileRef                         = useRef();
  const replaceIdRef                    = useRef(null); // set when the picker is replacing a staged file

  const keyFields = matchKey ? (Array.isArray(matchKey) ? matchKey : [matchKey]) : null;
  const canReplace = !!(keyFields && existingRecords);

  const allHeaders = [...new Set(files.flatMap((f) => f.headers))];

  // Re-guess the mapping whenever the staged file set changes.
  useEffect(() => {
    if (files.length) setMapping(autoMatchColumns(columns, allHeaders));
    else setMapping({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files]);

  /* ---- Template download ---- */
  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([columns.map((c) => c.label)]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, `${templateName}.xlsx`);
  };

  /* ---- Parse one File into { headers, raw } — no column mapping applied yet ---- */
  function parseFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = new Uint8Array(ev.target.result);
          const wb   = XLSX.read(data, { type: 'array', cellDates: true });
          const ws   = wb.Sheets[wb.SheetNames[0]];
          const raw  = XLSX.utils.sheet_to_json(ws, { defval: '' });
          const headerRow = XLSX.utils.sheet_to_json(ws, { header: 1 })[0] || [];
          const headers = raw.length ? Object.keys(raw[0]) : headerRow.map(String);
          resolve({ headers, raw });
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(reader.error || new Error('Could not read file'));
      reader.readAsArrayBuffer(file);
    });
  }

  // Columns explicitly marked required:true; falls back to just the first
  // column for any *_IMPORT_COLUMNS list that hasn't been annotated yet.
  const requiredCols = columns.some((c) => c.required) ? columns.filter((c) => c.required) : columns.slice(0, 1);
  const requiredKeys = new Set(requiredCols.map((c) => c.key));

  /* ---- Turn raw rows + current mapping into typed rows ready for onImport ---- */
  function buildRows(raw) {
    const rows = [];
    let skipped = 0;
    raw.forEach((rawRow) => {
      const row = {};
      let missingRequired = false;
      columns.forEach((col) => {
        const header = mapping[col.key];
        const rawVal = header ? rawRow[header] : undefined;
        const isBlank = rawVal === undefined || rawVal === null || String(rawVal).trim() === '';
        if (requiredKeys.has(col.key) && isBlank) missingRequired = true;
        if (!header) return;
        if (col.type === 'number') row[col.key] = parseFloat(rawVal) || 0;
        else if (col.type === 'date') row[col.key] = rawVal instanceof Date ? rawVal.toISOString().split('T')[0] : String(rawVal || '');
        else if (col.enumValues) row[col.key] = matchEnumValue(rawVal, col.enumValues);
        else row[col.key] = String(rawVal ?? '');
      });
      if (missingRequired) { skipped++; return; }
      rows.push(row);
    });
    return { rows, skipped };
  }

  /* ---- File picker handler — appends, or replaces one staged slot ---- */
  const handleFiles = async (e) => {
    const picked = Array.from(e.target.files || []);
    e.target.value = ''; // allow re-selecting the same file name
    if (!picked.length) return;

    const parsed = await Promise.all(picked.map(async (file) => {
      try {
        const { headers, raw } = await parseFile(file);
        return { id: nextFileId++, name: file.name, headers, raw };
      } catch (err) {
        return { id: nextFileId++, name: file.name, headers: [], raw: [], error: err.message };
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
  const setColumnMapping = (key, header) => setMapping((m) => ({ ...m, [key]: header || null }));

  const built = files.map((f) => ({ ...buildRows(f.raw), name: f.name }));
  const allRows      = built.flatMap((f) => f.rows);
  const totalSkipped = built.reduce((s, f) => s + f.skipped, 0);
  const previewRows  = allRows.slice(0, 5);
  const unmappedRequired = files.length > 0 ? requiredCols.filter((c) => !mapping[c.key]) : [];

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
    setMapping({});
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
                  <p className="text-sm font-semibold text-blue-800">Step 1 — Download the template (optional)</p>
                  <p className="text-xs text-blue-600 mt-0.5">Or upload your own file — you'll get to match its columns to ours next.</p>
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
                    <p className="text-xs text-gray-400 mt-0.5">Accepts .xlsx, .xls, .csv — column headers don't need to match exactly</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {files.map((f) => (
                      <div key={f.id} className="flex items-center gap-3 border border-gray-200 rounded-xl px-3 py-2.5">
                        <FileSpreadsheet size={16} className="text-green-600 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-700 truncate">{f.name}</p>
                          <p className="text-xs text-gray-400">
                            {f.error ? <span className="text-red-500">{f.error}</span> : `${f.raw.length} row${f.raw.length !== 1 ? 's' : ''} · ${f.headers.length} column${f.headers.length !== 1 ? 's' : ''} detected`}
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

              {files.length > 0 && allHeaders.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-1">Step 3 — Match your columns</p>
                  <p className="text-xs text-gray-500 mb-2">
                    We matched these automatically. If your file uses different wording, pick the right column for each field below.
                  </p>
                  <div className="border border-gray-100 rounded-xl divide-y divide-gray-50 overflow-hidden">
                    {columns.map((col) => (
                      <div key={col.key} className="flex items-center gap-3 px-3 py-2">
                        <span className="text-xs text-gray-600 flex-1 min-w-0 truncate">
                          {col.label}{requiredKeys.has(col.key) && <span className="text-red-500"> *</span>}
                        </span>
                        <select
                          value={mapping[col.key] || ''}
                          onChange={(e) => setColumnMapping(col.key, e.target.value)}
                          className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white max-w-[55%] focus:outline-none focus:ring-2 focus:ring-primary-900/30"
                        >
                          <option value="">— Not mapped —</option>
                          {allHeaders.map((h) => <option key={h} value={h}>{h}</option>)}
                        </select>
                      </div>
                    ))}
                  </div>
                  {unmappedRequired.length > 0 && (
                    <div className="flex items-start gap-2 mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                      <AlertTriangle size={13} className="shrink-0 mt-0.5" />
                      <span>{unmappedRequired.map((c) => `"${c.label}"`).join(', ')} {unmappedRequired.length === 1 ? 'is' : 'are'} required — map {unmappedRequired.length === 1 ? 'it' : 'them'} or every row will be skipped.</span>
                    </div>
                  )}
                </div>
              )}

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
                      No valid rows found. Check the column mapping above — the required field may not be mapped.
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
