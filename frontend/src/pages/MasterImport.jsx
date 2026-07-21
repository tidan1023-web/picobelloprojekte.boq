import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Upload, Download, CheckCircle, XCircle, Loader2, FileSpreadsheet, AlertTriangle } from 'lucide-react';
import api from '../services/api';
import { runImport } from '../utils/runImport';
import { matchExistingRecords } from '../utils/importMatch';
import { autoMatchColumns } from '../utils/columnMatch';

const MODULES = [
  {
    sheet: 'QS Prices',
    label: 'QS Prices',
    endpoint: '/qs-prices',
    listKey: 'prices',
    matchKey: ['item'],
    columns: [
      { key: 'category',    label: 'Category' },
      { key: 'subCategory', label: 'Sub Category' },
      { key: 'item',        label: 'Item' },
      { key: 'unit',        label: 'Unit' },
      { key: 'source',      label: 'Source' },
      { key: 'price',       label: 'Price' },
      { key: 'userAverage', label: 'My Average' },
    ],
  },
  {
    sheet: 'Artisan Rates',
    label: 'Artisan Rates',
    endpoint: '/artisan-prices',
    listKey: 'prices',
    matchKey: ['service'],
    columns: [
      { key: 'service',  label: 'Service' },
      { key: 'category', label: 'Trade' },
      { key: 'rate',     label: 'Rate (₦)' },
      { key: 'rateUnit', label: 'Rate Unit (per day/per hour/per job/per m²/per unit)' },
      { key: 'location', label: 'Location' },
    ],
  },
  {
    sheet: 'Materials',
    label: 'Materials',
    endpoint: '/material-prices',
    listKey: 'prices',
    matchKey: ['material'],
    columns: [
      { key: 'material', label: 'Material Name' },
      { key: 'category', label: 'Category' },
      { key: 'unit',     label: 'Unit' },
      { key: 'price',    label: 'Price (₦)' },
      { key: 'supplier', label: 'Supplier' },
    ],
  },
  {
    sheet: 'Contacts',
    label: 'Contacts',
    endpoint: '/contacts',
    listKey: 'contacts',
    matchKey: ['email', 'name'],
    columns: [
      { key: 'name',     label: 'Name' },
      { key: 'category', label: 'Category' },
      { key: 'company',  label: 'Company' },
      { key: 'email',    label: 'Email' },
      { key: 'phone',    label: 'Phone' },
      { key: 'address',  label: 'Address' },
      { key: 'notes',    label: 'Notes' },
    ],
  },
  {
    sheet: 'Historical Projects',
    label: 'Historical Projects',
    endpoint: '/historical-projects',
    listKey: 'projects',
    matchKey: ['name'],
    columns: [
      { key: 'name',          label: 'Project Name' },
      { key: 'projectType',   label: 'Type' },
      { key: 'location',      label: 'Location' },
      { key: 'client',        label: 'Client' },
      { key: 'contractValue', label: 'Contract Value' },
      { key: 'startDate',     label: 'Start Date' },
      { key: 'endDate',       label: 'End Date' },
      { key: 'sizeM2',        label: 'Size (m²)' },
      { key: 'condition',     label: 'Condition' },
      { key: 'tier',          label: 'Tier' },
      { key: 'totalCost',     label: 'Total Cost' },
      { key: 'completedYear', label: 'Year Completed' },
      { key: 'notes',         label: 'Notes' },
    ],
  },
];

function downloadTemplate() {
  const wb = XLSX.utils.book_new();
  MODULES.forEach(({ sheet, columns }) => {
    const ws = XLSX.utils.aoa_to_sheet([columns.map((c) => c.label)]);
    XLSX.utils.book_append_sheet(wb, ws, sheet);
  });
  XLSX.writeFile(wb, 'squaremetre-master-template.xlsx');
}

// Reads a sheet's raw rows (keyed by the file's own headers) without mapping
// them to our column keys yet — that happens in buildModuleRows, once we know
// how the file's headers correspond to our expected columns.
function parseSheetRaw(wb, sheetName) {
  const ws = wb.Sheets[sheetName];
  if (!ws) return { headers: [], raw: [] };
  const raw = XLSX.utils.sheet_to_json(ws, { defval: '' });
  const headerRow = XLSX.utils.sheet_to_json(ws, { header: 1 })[0] || [];
  const headers = raw.length ? Object.keys(raw[0]) : headerRow.map(String);
  return { headers, raw };
}

// mapping: { [columnKey]: header|null } — the confirmed (or auto-guessed) match
// between our expected columns and the file's actual headers for this sheet.
function buildModuleRows(raw, columns, mapping) {
  const firstKey = columns[0]?.key;
  return raw
    .map((r) => {
      const row = {};
      columns.forEach((c) => {
        const header = mapping[c.key];
        if (!header) return;
        const val = r[header];
        row[c.key] = val instanceof Date ? val.toISOString().split('T')[0] : val;
      });
      return row;
    })
    .filter((r) => firstKey && r[firstKey] !== '' && r[firstKey] != null);
}

let nextFileId = 1;

export default function MasterImport() {
  const fileRef = useRef(null);
  const [files, setFiles] = useState([]); // [{ id, name, workbook }]
  const [preview, setPreview] = useState(null); // [{ sheet, label, headers, found }]
  const [rawBySheet, setRawBySheet] = useState({}); // { [sheet]: rawRows[] } — combined across files
  const [mapping, setMapping] = useState({}); // { [sheet]: { columnKey: header|null } }
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(null); // { label, current, total }
  const [results, setResults] = useState(null);
  const [replaceExisting, setReplaceExisting] = useState(false);
  const replaceIdRef = useRef(null);

  const rebuildPreview = (fileList) => {
    const nextMapping = {};
    const nextRaw = {};
    const summaries = MODULES.map(({ sheet, label, columns }) => {
      const parsedPerFile = fileList.map((f) => parseSheetRaw(f.workbook, sheet));
      const headers = [...new Set(parsedPerFile.flatMap((p) => p.headers))];
      const found = fileList.some((f) => f.workbook.SheetNames.includes(sheet));
      nextMapping[sheet] = headers.length ? autoMatchColumns(columns, headers) : {};
      nextRaw[sheet] = parsedPerFile.flatMap((p) => p.raw);
      return { sheet, label, headers, found };
    });
    setMapping(nextMapping);
    setRawBySheet(nextRaw);
    setPreview(summaries);
  };

  // Row counts recompute live as the user edits the column mapping.
  const rowCounts = MODULES.reduce((acc, mod) => {
    acc[mod.sheet] = buildModuleRows(rawBySheet[mod.sheet] || [], mod.columns, mapping[mod.sheet] || {}).length;
    return acc;
  }, {});

  const handleFile = (e) => {
    const picked = Array.from(e.target.files || []);
    e.target.value = '';
    if (!picked.length) return;

    let remaining = picked.length;
    const parsed = [];
    picked.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const data = new Uint8Array(ev.target.result);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        parsed.push({ id: nextFileId++, name: file.name, workbook });
        if (--remaining === 0) {
          setFiles((prev) => {
            let next;
            if (replaceIdRef.current != null) {
              const idx = prev.findIndex((f) => f.id === replaceIdRef.current);
              next = idx === -1 ? [...prev, ...parsed] : [...prev.slice(0, idx), ...parsed, ...prev.slice(idx + 1)];
            } else {
              next = [...prev, ...parsed];
            }
            rebuildPreview(next);
            return next;
          });
          replaceIdRef.current = null;
          setResults(null);
        }
      };
      reader.readAsArrayBuffer(file);
    });
  };

  const triggerAdd = () => { replaceIdRef.current = null; fileRef.current?.click(); };
  const triggerReplace = (id) => { replaceIdRef.current = id; fileRef.current?.click(); };
  const removeFile = (id) => setFiles((prev) => {
    const next = prev.filter((f) => f.id !== id);
    if (next.length) rebuildPreview(next); else { setPreview(null); setMapping({}); setRawBySheet({}); }
    return next;
  });

  const setColumnMapping = (sheet, key, header) =>
    setMapping((m) => ({ ...m, [sheet]: { ...m[sheet], [key]: header || null } }));

  const handleImport = async () => {
    if (!files.length) return;
    setImporting(true);
    const out = [];
    try {
      for (const mod of MODULES) {
        let rows;
        try {
          rows = buildModuleRows(rawBySheet[mod.sheet] || [], mod.columns, mapping[mod.sheet] || {});
        } catch (err) {
          out.push({ label: mod.label, imported: 0, skipped: 0, errors: [{ row: 0, message: `Could not read sheet: ${err.message}` }] });
          continue;
        }
        if (rows.length === 0) { out.push({ label: mod.label, imported: 0, skipped: 0, errors: [] }); continue; }

        let importRows = rows;
        if (replaceExisting) {
          try {
            const { data } = await api.get(mod.endpoint);
            importRows = matchExistingRecords(rows, data[mod.listKey] || [], mod.matchKey);
          } catch { /* fall back to plain create if the existing list can't be fetched */ }
        }

        const result = await runImport(importRows, (row) => (row._id ? api.put(`${mod.endpoint}/${row._id}`, row) : api.post(mod.endpoint, row)), {
          onProgress: (current, total) => setProgress({ label: mod.label, current, total }),
        });
        out.push({ label: mod.label, imported: result.imported, skipped: result.skipped, errors: result.errors });
      }
    } finally {
      // Always clear the importing state, even if something above threw unexpectedly —
      // this is what used to leave the "Importing…" spinner stuck forever.
      setResults(out);
      setImporting(false);
      setProgress(null);
      setPreview(null);
      setMapping({});
      setRawBySheet({});
      setFiles([]);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Master Import</h1>
        <p className="text-sm text-gray-500 mt-1">
          Upload a single Excel file with one sheet per module. The app reads each sheet and saves the data to the right place automatically.
        </p>
      </div>

      {/* Template download */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <p className="font-semibold text-gray-800 text-sm">Download Template</p>
          <p className="text-xs text-gray-400 mt-0.5">Pre-formatted with the correct sheet names and column headers for all 5 modules.</p>
        </div>
        <button onClick={downloadTemplate}
          className="flex items-center gap-2 border border-gray-200 text-gray-700 px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors shrink-0">
          <Download size={15} /> Download Template
        </button>
      </div>

      {/* Sheet legend */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Sheets in the template</p>
        <div className="space-y-2">
          {MODULES.map(({ sheet, label, columns }) => (
            <div key={sheet} className="flex items-start gap-3">
              <span className="inline-block bg-primary-50 text-primary-900 border border-primary-200 text-xs font-medium px-2 py-0.5 rounded-full mt-0.5 shrink-0">{sheet}</span>
              <span className="text-xs text-gray-500 leading-relaxed">{columns.map(c => c.label).join(' · ')}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Upload */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <p className="font-semibold text-gray-800 text-sm mb-3">Upload Your File(s)</p>

        {files.length === 0 ? (
          <button
            onClick={triggerAdd}
            className="w-full border-2 border-dashed border-gray-200 rounded-xl py-10 flex flex-col items-center gap-3 hover:border-primary-900/40 hover:bg-gray-50 transition-colors"
          >
            <FileSpreadsheet size={32} className="text-gray-300" />
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600">Click to select one or more Excel files</p>
              <p className="text-xs text-gray-400 mt-0.5">Accepts .xlsx, .xls, .csv</p>
            </div>
          </button>
        ) : (
          <div className="space-y-2">
            {files.map((f) => (
              <div key={f.id} className="flex items-center gap-3 border border-gray-200 rounded-xl px-3 py-2.5">
                <FileSpreadsheet size={16} className="text-green-600 shrink-0" />
                <p className="flex-1 min-w-0 text-sm font-medium text-gray-700 truncate">{f.name}</p>
                <button type="button" onClick={() => triggerReplace(f.id)} title="Replace this file"
                  className="p-1.5 text-gray-400 hover:text-primary-900 hover:bg-gray-50 rounded-lg shrink-0">
                  <Upload size={14} />
                </button>
                <button type="button" onClick={() => removeFile(f.id)} title="Remove this file"
                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg shrink-0">
                  <XCircle size={14} />
                </button>
              </div>
            ))}
            <button type="button" onClick={triggerAdd} className="text-xs font-medium text-primary-900 hover:underline">
              + Add more files
            </button>
          </div>
        )}
        <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" multiple className="hidden" onChange={handleFile} />
      </div>

      {/* Preview */}
      {preview && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <p className="font-semibold text-gray-800 text-sm">Ready to Import</p>
          <p className="text-xs text-gray-500 -mt-2">
            Column headers don't need to match our template exactly — expand a module below to check or correct the match.
          </p>
          <div className="space-y-1">
            {preview.map(({ sheet, label, headers, found }) => {
              const mod = MODULES.find((m) => m.sheet === sheet);
              const rows = rowCounts[sheet] || 0;
              const map = mapping[sheet] || {};
              const requiredCol = mod.columns[0];
              const requiredUnmapped = found && headers.length > 0 && !map[requiredCol.key];
              return (
                <details key={label} className="group border-b border-gray-50 last:border-0">
                  <summary className="flex items-center justify-between py-2 cursor-pointer list-none">
                    <div className="flex items-center gap-2">
                      {found ? <CheckCircle size={14} className="text-green-500" /> : <XCircle size={14} className="text-gray-300" />}
                      <span className="text-sm text-gray-700">{label}</span>
                      {requiredUnmapped && <AlertTriangle size={13} className="text-amber-500" />}
                    </div>
                    <span className={`text-sm font-medium ${rows > 0 ? 'text-gray-800' : 'text-gray-400'}`}>
                      {found ? (rows > 0 ? `${rows} row${rows !== 1 ? 's' : ''}` : 'Sheet empty') : 'Sheet not found'}
                    </span>
                  </summary>
                  {found && headers.length > 0 && (
                    <div className="pb-3 pl-6 space-y-1.5">
                      {mod.columns.map((col, i) => (
                        <div key={col.key} className="flex items-center gap-3">
                          <span className="text-xs text-gray-600 flex-1 min-w-0 truncate">
                            {col.label}{i === 0 && <span className="text-red-500"> *</span>}
                          </span>
                          <select
                            value={map[col.key] || ''}
                            onChange={(e) => setColumnMapping(sheet, col.key, e.target.value)}
                            className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white max-w-[55%] focus:outline-none focus:ring-2 focus:ring-primary-900/30"
                          >
                            <option value="">— Not mapped —</option>
                            {headers.map((h) => <option key={h} value={h}>{h}</option>)}
                          </select>
                        </div>
                      ))}
                    </div>
                  )}
                </details>
              );
            })}
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={replaceExisting} onChange={(e) => setReplaceExisting(e.target.checked)}
              className="rounded border-gray-300 text-primary-900 focus:ring-primary-900/30" />
            Replace existing entries that match (otherwise every row is added as new)
          </label>

          <div className="flex items-center justify-between gap-3">
            {importing && progress && (
              <p className="text-xs text-gray-500">
                {progress.label} — {progress.current} of {progress.total}
              </p>
            )}
            <button onClick={handleImport} disabled={importing || Object.values(rowCounts).every((n) => n === 0)}
              className="flex items-center gap-2 bg-primary-900 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-primary-800 disabled:opacity-50 transition-colors ml-auto">
              {importing ? <><Loader2 size={15} className="animate-spin" /> Importing…</> : 'Import All'}
            </button>
          </div>
        </div>
      )}

      {/* Results */}
      {results && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <p className="font-semibold text-gray-800 text-sm">Import Complete</p>
          <div className="space-y-2">
            {results.map(({ label, imported, skipped, errors }) => (
              <div key={label} className="py-2 border-b border-gray-50 last:border-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">{label}</span>
                  <span className="text-sm">
                    <span className="text-green-700 font-medium">{imported} imported</span>
                    {skipped > 0 && <span className="text-gray-400 ml-2">{skipped} skipped</span>}
                  </span>
                </div>
                {errors?.length > 0 && (
                  <ul className="mt-1 text-xs text-amber-600 space-y-0.5">
                    {errors.map((e, i) => (
                      <li key={i}>Row {e.row}: {e.message}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
          <button onClick={() => fileRef.current?.click()}
            className="text-sm text-primary-900 font-medium hover:underline">
            Import another file
          </button>
        </div>
      )}
    </div>
  );
}
