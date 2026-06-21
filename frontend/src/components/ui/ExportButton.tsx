'use client';

import { useState, useRef, useEffect } from 'react';
import { Download, ChevronDown } from 'lucide-react';
import { clsx } from 'clsx';
import type { ExportColumn } from '@/lib/export';

interface ExportButtonProps {
  rows: Record<string, unknown>[];
  columns: ExportColumn[];
  baseName: string;
  title: string;
  className?: string;
}

export function ExportButton({ rows, columns, baseName, title, className }: ExportButtonProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handle = async (format: 'csv' | 'xlsx' | 'pdf') => {
    setOpen(false);
    const { exportRows } = await import('@/lib/export');
    exportRows(rows, baseName, title, columns, format);
  };

  return (
    <div className={clsx('relative', className)} ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
      >
        <Download className="h-3.5 w-3.5" />
        Export
        <ChevronDown className="h-3 w-3" />
      </button>
      {open && (
        <div className="absolute right-0 mt-1 w-40 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg z-20 overflow-hidden">
          {(['csv', 'xlsx', 'pdf'] as const).map((fmt) => (
            <button
              key={fmt}
              onClick={() => handle(fmt)}
              className="w-full text-left px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              {fmt === 'csv' ? 'CSV (.csv)' : fmt === 'xlsx' ? 'Excel (.xlsx)' : 'PDF (.pdf)'}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
