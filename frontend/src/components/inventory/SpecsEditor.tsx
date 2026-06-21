'use client';

import { useState } from 'react';
import { Plus, Trash2, Edit2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface SpecsEditorProps {
  specs: Record<string, string>;
  onChange: (specs: Record<string, string>) => void;
  readOnly?: boolean;
}

interface EditState {
  key: string;
  value: string;
}

export function SpecsEditor({ specs, onChange, readOnly }: SpecsEditorProps) {
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState>({ key: '', value: '' });
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [addingNew, setAddingNew] = useState(false);

  const entries = Object.entries(specs);

  const startEdit = (key: string, value: string) => {
    setEditingKey(key);
    setEditState({ key, value });
  };

  const commitEdit = () => {
    if (!editingKey) return;
    const updated = { ...specs };
    if (editState.key !== editingKey) {
      delete updated[editingKey];
    }
    if (editState.key.trim()) {
      updated[editState.key.trim()] = editState.value;
    }
    onChange(updated);
    setEditingKey(null);
  };

  const deleteSpec = (key: string) => {
    const updated = { ...specs };
    delete updated[key];
    onChange(updated);
  };

  const addSpec = () => {
    const trimmedKey = newKey.trim();
    const trimmedValue = newValue.trim();
    if (!trimmedKey) return;
    onChange({ ...specs, [trimmedKey]: trimmedValue });
    setNewKey('');
    setNewValue('');
    setAddingNew(false);
  };

  return (
    <div className="space-y-2">
      {entries.length === 0 && !addingNew && (
        <p className="text-sm text-slate-400 dark:text-slate-500 italic py-2">No specifications added yet.</p>
      )}

      <div className="space-y-1.5">
        {entries.map(([key, value]) => (
          <div
            key={key}
            className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 group"
          >
            {editingKey === key ? (
              <>
                <Input
                  value={editState.key}
                  onChange={(e) => setEditState((s) => ({ ...s, key: e.target.value }))}
                  className="h-8 text-xs flex-1"
                  placeholder="Field name"
                />
                <Input
                  value={editState.value}
                  onChange={(e) => setEditState((s) => ({ ...s, value: e.target.value }))}
                  className="h-8 text-xs flex-1"
                  placeholder="Value"
                />
                <button onClick={commitEdit} className="p-1 text-green-600 hover:text-green-700">
                  <Check className="h-4 w-4" />
                </button>
                <button onClick={() => setEditingKey(null)} className="p-1 text-slate-400 hover:text-slate-600">
                  <X className="h-4 w-4" />
                </button>
              </>
            ) : (
              <>
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300 w-32 shrink-0 truncate">{key}</span>
                <span className="text-xs text-slate-400 dark:text-slate-500 mx-1">·</span>
                <span className="text-xs text-slate-800 dark:text-slate-200 flex-1 truncate">{value}</span>
                {!readOnly && (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => startEdit(key, value)}
                      className="p-1 text-slate-400 hover:text-brand-600"
                      title="Edit"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => deleteSpec(key)}
                      className="p-1 text-slate-400 hover:text-red-600"
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </div>

      {!readOnly && (
        <>
          {addingNew ? (
            <div className="flex items-end gap-2 p-3 bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800 rounded-lg">
              <Input
                label="Field Name"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                placeholder="e.g. Manufacturer"
                className="text-sm"
              />
              <Input
                label="Value"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                placeholder="e.g. Medtronic"
                className="text-sm"
              />
              <Button size="sm" onClick={addSpec} disabled={!newKey.trim()}>
                <Check className="h-3.5 w-3.5" />
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setAddingNew(false); setNewKey(''); setNewValue(''); }}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAddingNew(true)}
              leftIcon={<Plus className="h-3.5 w-3.5" />}
            >
              Add Specification
            </Button>
          )}
        </>
      )}
    </div>
  );
}
