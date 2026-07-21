import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Upload, Download, CheckCircle, XCircle, Loader2, FileSpreadsheet, AlertTriangle } from 'lucide-react';
import api from '../services/api';
import { runImport } from '../utils/runImport';
import { matchExistingRecords } from '../utils/importMatch';
import { autoMatchColumns } from '../utils/columnMatch';
import { matchEnumValue } from '../utils/enumMatch';

const MODULES = [
  {
    sheet: 'QS Prices',
    label: 'QS Prices',
    endpoint: '/qs-prices',
    listKey: 'prices',
    matchKey: ['item'],
    columns: [
      { key: 'category',    label: 'Category', required: true },
      { key: 'subCategory', label: 'Sub Category' },
      { key: 'item',        label: 'Item', required: true },
      { key: 'unit',        label: 'Unit', required: true },
      { key: 'source',      label: 'Source' },
      { key: 'price',       label: 'Price', required: true },
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
      { key: 'service',  label: 'Service', required: true },
      { key: 'category', label: 'Trade' },
      { key: 'rate',     label: 'Rate (₦)', required: true },
      { key: 'rateUnit', label: 'Rate Unit (per day/per hour/per job/per m²/per unit)',
        enumValues: ['per day', 'per hour', 'per job', 'per m²', 'per unit'] },
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
      { key: 'material', label: 'Material Name', required: true },
      { key: 'category', label: 'Category' },
      { key: 'unit',     label: 'Unit', required: true },
      { key: 'price',    label: 'Price (₦)', required: true },
      { key: 'supplier', label: 'Supplier', required: true },
    ],
  },
  {
    sheet: 'Contacts',
    label: 'Contacts',
    endpoint: '/contacts',
    listKey: 'contacts',
    matchKey: ['email', 'name'],
    columns: [
      { key: 'name',     label: 'Name', required: true },
      { key: 'category', label: 'Category (client/contractor/subcontractor/supplier/consultant/architect/engineer/other)',
        enumValues: ['client', 'contractor', 'subcontractor', 'supplier', 'consultant', 'architect', 'engineer', 'other'] },
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
      { key: 'name',          label: 'Project Name', required: true },
      { key: 'projectType',   label: 'Type' },
      { key: 'location',      label: 'Location' },
      { key: 'client',        label: 'Client' },
      { key: 'contractValue', label: 'Contract Value' },
      { key: 'startDate',     label: 'Start Date' },
      { key: 'endDate',       label: 'End Date' },
      { key: 'sizeM2',        label: 'Size (m²)', required: true },
      { key: 'condition',     label: 'Condition (Carcass/Advanced Carcass/Semi-Finished/Finished)', required: true,
        enumValues: ['carcass', 'advanced_carcass', 'semi_finished', 'finished'],
        enumLabels: { carcass: 'Carcass', advanced_carcass: 'Advanced Carcass', semi_finished: 'Semi-Finished', finished: 'Finished (Facelift)' } },
      { key: 'tier',          label: 'Tier (Basic/Mid-Range/Premium)', required: true,
        enumValues: ['basic', 'mid_range', 'premium'],
        enumLabels: { basic: 'Basic', mid_range: 'Mid-Range', premium: 'Premium' } },
      { key: 'totalCost',     label: 'Total Cost', required: true },
      { key: 'completedYear', label: 'Year Completed', required: true },
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

// Columns explicitly marked required:true; falls back to just the first
// column for any module list that hasn't been annotated yet.
function requiredColumnsOf(columns) {
  return columns.some((c) => c.required) ? columns.filter((c) => c.required) : columns.slice(0, 1);
}

// mapping: { [columnKey]: header|null } — the confirmed (or auto-guessed) match
// between our expected columns and the file's actual headers for this sheet.
// valueOverrides: { [columnKey]: { [rawValue]: enumValue } } — user corrections
// for enum values auto-matching couldn't confidently guess.
function buildModuleRows(raw, columns, mapping, valueOverrides = {}) {
  const requiredKeys = new Set(requiredColumnsOf(columns).map((c) => c.key));
  const rows = [];
  raw.forEach((r) => {
    const row = {};
    let missingRequired = false;
    columns.forEach((c) => {
      const header = mapping[c.key];
      const rawVal = header ? r[header] : undefined;
      const isBlank = rawVal === undefined || rawVal === null || String(rawVal).trim() === '';
      if (requiredKeys.has(c.key) && isBlank) missingRequired = true;
      if (!header) return;
      if (rawVal instanceof Date) row[c.key] = rawVal.toISOString().split('T')[0];
      else if (c.enumValues) {
        const rawKey = String(rawVal ?? '');
        row[c.key] = valueOverrides[c.key]?.[rawKey] ?? matchEnumValue(rawVal, c.enumValues);
      }
      else row[c.key] = rawVal;
    });
    if (!missingRequired) rows.push(row);
  });
  return rows;
}

let nextFileId = 1;

export default function MasterImport() {
  const fileRef = useRef(null);
  const [files, setFiles] = useState([]); // [{ id, name, workbook }]
  const [preview, setPreview] = useState(null); // [{ sheet, label, headers, found }]
  const [rawBySheet, setRawBySheet] = useState({}); // { [sheet]: rawRows[] } — combined across files
  const [mapping, setMapping] = useState({}); // { [sheet]: { columnKey: header|null } }
  const [valueOverrides, setValueOverrides] = useState({}); // { [sheet]: { columnKey: { rawValue: enumValue } } }
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
    setValueOverrides({});
    setPreview(summaries);
  };

  const setValueOverride = (sheet, colKey, rawVal, enumVal) =>
    setValueOverrides((v) => ({
      ...v,
      [sheet]: { ...v[sheet], [colKey]: { ...v[sheet]?.[colKey], [rawVal]: enumVal } },
    }));

  // Row counts recompute live as the user edits the column mapping.
  const rowCounts = MODULES.reduce((acc, mod) => {
    acc[mod.sheet] = buildModuleRows(rawBySheet[mod.sheet] || [], mod.columns, mapping[mod.sheet] || {}, valueOverrides[mod.sheet] || {}).length;
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
    if (next.length) rebuildPreview(next); else { setPreview(null); setMapping({}); setRawBySheet({}); setValueOverrides({}); }
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
          rows = buildModuleRows(rawBySheet[mod.sheet] || [], mod.columns, mapping[mod.sheet] || {}, valueOverrides[mod.sheet] || {});
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
      setValueOverrides({});
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
              const requiredKeys = new Set(requiredColumnsOf(mod.columns).map((c) => c.key));
              const unmappedRequired = found && headers.length > 0
                ? mod.columns.filter((c) => requiredKeys.has(c.key) && !map[c.key])
                : [];
              const sheetOverrides = valueOverrides[sheet] || {};
              const enumColumnsWithValues = mod.columns
                .filter((c) => c.enumValues && map[c.key])
                .map((c) => {
                  const header = map[c.key];
                  const values = new Set();
                  (rawBySheet[sheet] || []).forEach((r) => {
                    const v = r[header];
                    if (v !== undefined && v !== null && String(v).trim() !== '') values.add(String(v));
                  });
                  return { col: c, values: [...values] };
                })
                .filter((e) => e.values.length > 0);
              return (
                <details key={label} className="group border-b border-gray-50 last:border-0">
                  <summary className="flex items-center justify-between py-2 cursor-pointer list-none">
                    <div className="flex items-center gap-2">
                      {found ? <CheckCircle size={14} className="text-green-500" /> : <XCircle size={14} className="text-gray-300" />}
                      <span className="text-sm text-gray-700">{label}</span>
                      {unmappedRequired.length > 0 && <AlertTriangle size={13} className="text-amber-500" />}
                    </div>
                    <span className={`text-sm font-medium ${rows > 0 ? 'text-gray-800' : 'text-gray-400'}`}>
                      {found ? (rows > 0 ? `${rows} row${rows !== 1 ? 's' : ''}` : 'Sheet empty') : 'Sheet not found'}
                    </span>
                  </summary>
                  {found && headers.length > 0 && (
                    <div className="pb-3 pl-6 space-y-1.5">
                      {mod.columns.map((col) => (
                        <div key={col.key} className="flex items-center gap-3">
                          <span className="text-xs text-gray-600 flex-1 min-w-0 truncate">
                            {col.label}{requiredKeys.has(col.key) && <span className="text-red-500"> *</span>}
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
                      {unmappedRequired.length > 0 && (
                        <div className="flex items-start gap-2 mt-1 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                          <AlertTriangle size={13} className="shrink-0 mt-0.5" />
                          <span>{unmappedRequired.map((c) => `"${c.label}"`).join(', ')} {unmappedRequired.length === 1 ? 'is' : 'are'} required.</span>
                        </div>
                      )}
                      {enumColumnsWithValues.length > 0 && (
                        <div className="pt-2 space-y-2">
                          <p className="text-xs font-semibold text-gray-700">Check these values</p>
                          {enumColumnsWithValues.map(({ col, values }) => (
                            <div key={col.key} className="border border-gray-100 rounded-lg p-2.5">
                              <p className="text-xs font-medium text-gray-600 mb-1.5">{col.label}</p>
                              <div className="space-y-1">
                                {values.map((val) => {
                                  const guessed = sheetOverrides[col.key]?.[val] ?? matchEnumValue(val, col.enumValues);
                                  const isUnmatched = !col.enumValues.includes(guessed);
                                  return (
                                    <div key={val} className="flex items-center gap-2">
                                      <span className={`text-xs flex-1 min-w-0 truncate ${isUnmatched ? 'text-red-600 font-medium' : 'text-gray-600'}`} title={val}>
                                        "{val}"{isUnmatched && ' — no match'}
                                      </span>
                                      <span className="text-gray-300 text-xs shrink-0">→</span>
                                      <select
                                        value={isUnmatched ? '' : guessed}
                                        onChange={(e) => setValueOverride(sheet, col.key, val, e.target.value)}
                                        className={`text-xs border rounded-lg px-2 py-1 bg-white max-w-[50%] focus:outline-none focus:ring-2 focus:ring-primary-900/30 ${isUnmatched ? 'border-red-300' : 'border-gray-200'}`}
                                      >
                                        <option value="">— Choose —</option>
                                        {col.enumValues.map((ev) => (
                                          <option key={ev} value={ev}>{col.enumLabels?.[ev] || ev}</option>
                                        ))}
                                      </select>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
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
