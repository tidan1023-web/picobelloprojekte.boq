import React from 'react';
import { clsx } from 'clsx';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftAddon?: React.ReactNode;
}

export function Input({ label, error, hint, leftAddon, className, id, ...props }: InputProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-slate-700 dark:text-slate-300">
          {label}
          {props.required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      <div className="relative">
        {leftAddon && (
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400 dark:text-slate-500">
            {leftAddon}
          </div>
        )}
        <input
          id={inputId}
          className={clsx(
            'w-full rounded-lg border bg-white dark:bg-slate-700 px-3 py-2 text-sm',
            'text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500',
            'focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent',
            'disabled:bg-slate-50 dark:disabled:bg-slate-800 disabled:cursor-not-allowed',
            error
              ? 'border-red-400 focus:ring-red-500'
              : 'border-slate-300 dark:border-slate-600',
            leftAddon && 'pl-9',
            className
          )}
          {...props}
        />
      </div>
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
      {hint && !error && <p className="text-xs text-slate-500 dark:text-slate-400">{hint}</p>}
    </div>
  );
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export function Textarea({ label, error, hint, className, id, ...props }: TextareaProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-slate-700 dark:text-slate-300">
          {label}
          {props.required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      <textarea
        id={inputId}
        className={clsx(
          'w-full rounded-lg border bg-white dark:bg-slate-700 px-3 py-2 text-sm resize-y',
          'text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500',
          'focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent',
          'disabled:bg-slate-50 dark:disabled:bg-slate-800 disabled:cursor-not-allowed',
          error ? 'border-red-400' : 'border-slate-300 dark:border-slate-600',
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
      {hint && !error && <p className="text-xs text-slate-500 dark:text-slate-400">{hint}</p>}
    </div>
  );
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
}

export function Select({
  label,
  error,
  options,
  placeholder,
  className,
  id,
  ...props
}: SelectProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-slate-700 dark:text-slate-300">
          {label}
          {props.required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      <select
        id={inputId}
        className={clsx(
          'w-full rounded-lg border bg-white dark:bg-slate-700 px-3 py-2 text-sm',
          'text-slate-900 dark:text-slate-100',
          'focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent',
          'disabled:bg-slate-50 dark:disabled:bg-slate-800 disabled:cursor-not-allowed',
          error ? 'border-red-400' : 'border-slate-300 dark:border-slate-600',
          className
        )}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
