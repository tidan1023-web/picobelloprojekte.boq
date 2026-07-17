import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Upload, Download, CheckCircle, XCircle, Loader2, FileSpreadsheet } from 'lucide-react';
import api from '../services/api';

const MODULES = [
  {
    sheet: 'QS Prices',
    label: 'QS Prices',
    endpoint: '/qs-prices',
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
    columns: [
      { key: 'name',     label: 'Name' },
      { key: 'trade',    label: 'Trade' },
      { key: 'unit',     label: 'Unit' },
      { key: 'rate',     label: 'Rate (₦)' },
      { key: 'location', label: 'Location' },
      { key: 'source',   label: 'Source' },
    ],
  },
  {
    sheet: 'Materials',
    label: 'Materials',
    endpoint: '/material-prices',
    columns: [
      { key: 'name',     label: 'Material Name' },
      { key: 'category', label: 'Category' },
      { key: 'unit',     label: 'Unit' },
      { key: 'price',    label: 'Price (₦)' },
      { key: 'supplier', label: 'Supplier' },
      { key: 'source',   label: 'Source' },
    ],
  },
  {
    sheet: 'Contacts',
    label: 'Contacts',
    endpoint: '/contacts',
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

function parseSheet(wb, sheetName, columns) {
  const ws = wb.Sheets[sheetName];
  if (!ws) return [];
  const raw = XLSX.utils.sheet_to_json(ws, { defval: '' });
  const headerMap = {};
  columns.forEach((c) => { headerMap[c.label.toLowerCase()] = c.key; });
  return raw.map((r) => {
    const row = {};
    Object.entries(r).forEach(([h, val]) => {
      const key = headerMap[h.toLowerCase().trim()];
      if (key) row[key] = val instanceof Date ? val.toISOString().split('T')[0] : val;
    });
    return row;
  }).filter((r) => Object.values(r).some((v) => v !== '' && v != null));
}

export default function MasterImport() {
  const fileRef = useRef(null);
  const [preview, setPreview] = useState(null); // { sheetSummaries }
  const [wb, setWb] = useState(null);
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState(null);

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const data = new Uint8Array(ev.target.result);
      const workbook = XLSX.read(data, { type: 'array', cellDates: true });
      setWb(workbook);
      const summaries = MODULES.map(({ sheet, label, columns }) => {
        const rows = parseSheet(workbook, sheet, columns);
        return { sheet, label, rows: rows.length, found: workbook.SheetNames.includes(sheet) };
      });
      setPreview(summaries);
      setResults(null);
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  const handleImport = async () => {
    if (!wb) return;
    setImporting(true);
    const out = [];
    for (const mod of MODULES) {
      const rows = parseSheet(wb, mod.sheet, mod.columns);
      if (rows.length === 0) { out.push({ label: mod.label, imported: 0, skipped: 0 }); continue; }
      let imported = 0, skipped = 0;
      for (const row of rows) {
        try { await api.post(mod.endpoint, row); imported++; } catch { skipped++; }
      }
      out.push({ label: mod.label, imported, skipped });
    }
    setResults(out);
    setImporting(false);
    setPreview(null);
    setWb(null);
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
        <p className="font-semibold text-gray-800 text-sm mb-3">Upload Your File</p>
        <button
          onClick={() => fileRef.current?.click()}
          className="w-full border-2 border-dashed border-gray-200 rounded-xl py-10 flex flex-col items-center gap-3 hover:border-primary-900/40 hover:bg-gray-50 transition-colors"
        >
          <FileSpreadsheet size={32} className="text-gray-300" />
          <div className="text-center">
            <p className="text-sm font-medium text-gray-600">Click to select your Excel file</p>
            <p className="text-xs text-gray-400 mt-0.5">Accepts .xlsx, .xls, .csv</p>
          </div>
        </button>
        <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFile} />
      </div>

      {/* Preview */}
      {preview && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <p className="font-semibold text-gray-800 text-sm">Ready to Import</p>
          <div className="space-y-2">
            {preview.map(({ label, rows, found }) => (
              <div key={label} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-2">
                  {found ? <CheckCircle size={14} className="text-green-500" /> : <XCircle size={14} className="text-gray-300" />}
                  <span className="text-sm text-gray-700">{label}</span>
                </div>
                <span className={`text-sm font-medium ${rows > 0 ? 'text-gray-800' : 'text-gray-400'}`}>
                  {found ? (rows > 0 ? `${rows} row${rows !== 1 ? 's' : ''}` : 'Sheet empty') : 'Sheet not found'}
                </span>
              </div>
            ))}
          </div>
          <div className="flex justify-end">
            <button onClick={handleImport} disabled={importing || preview.every(p => p.rows === 0)}
              className="flex items-center gap-2 bg-primary-900 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-primary-800 disabled:opacity-50 transition-colors">
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
            {results.map(({ label, imported, skipped }) => (
              <div key={label} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <span className="text-sm text-gray-700">{label}</span>
                <span className="text-sm">
                  <span className="text-green-700 font-medium">{imported} imported</span>
                  {skipped > 0 && <span className="text-gray-400 ml-2">{skipped} skipped</span>}
                </span>
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
