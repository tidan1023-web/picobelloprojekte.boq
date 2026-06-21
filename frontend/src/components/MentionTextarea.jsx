import React, { useRef, useState, useEffect } from 'react';

/**
 * MentionTextarea — a textarea that shows a @mention dropdown when the user types '@'.
 *
 * Props:
 *   value        string
 *   onChange     (e) => void   — called with a synthetic-like event { target: { value } }
 *   teamMembers  [{ _id, name, role }]
 *   className    string
 *   placeholder  string
 *   rows         number
 */
export default function MentionTextarea({ value = '', onChange, teamMembers = [], className = '', placeholder = '', rows = 3 }) {
  const [query, setQuery]       = useState('');
  const [showDrop, setShowDrop] = useState(false);
  const [triggerIdx, setTriggerIdx] = useState(-1);
  const textareaRef = useRef(null);

  // Derive filtered list from current query
  const filtered = query === null ? [] : teamMembers.filter((m) =>
    m.name.toLowerCase().includes((query || '').toLowerCase())
  );

  const handleChange = (e) => {
    const text   = e.target.value;
    const cursor = e.target.selectionStart;

    // Find the nearest '@' before the cursor
    const before = text.slice(0, cursor);
    const atIdx  = before.lastIndexOf('@');

    if (atIdx !== -1) {
      const afterAt = before.slice(atIdx + 1);
      // Only trigger if no whitespace between '@' and cursor
      if (!/\s/.test(afterAt)) {
        setTriggerIdx(atIdx);
        setQuery(afterAt);
        setShowDrop(true);
        onChange && onChange(e);
        return;
      }
    }

    setShowDrop(false);
    setTriggerIdx(-1);
    setQuery('');
    onChange && onChange(e);
  };

  const insertMention = (member) => {
    const before  = value.slice(0, triggerIdx);
    const cursor  = textareaRef.current?.selectionStart ?? value.length;
    const after   = value.slice(cursor);
    const newVal  = `${before}@${member.name} ${after}`;

    onChange && onChange({ target: { value: newVal } });
    setShowDrop(false);
    setTriggerIdx(-1);
    setQuery('');

    // Restore focus & move cursor after the inserted mention
    requestAnimationFrame(() => {
      if (textareaRef.current) {
        const pos = before.length + member.name.length + 2; // '@' + name + ' '
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(pos, pos);
      }
    });
  };

  // Close dropdown on outside click
  useEffect(() => {
    const close = (e) => {
      if (!textareaRef.current?.parentElement?.contains(e.target)) setShowDrop(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        rows={rows}
        className={className}
        placeholder={placeholder}
      />

      {showDrop && filtered.length > 0 && (
        <div className="absolute z-50 left-0 mt-1 w-60 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden max-h-48 overflow-y-auto">
          {filtered.map((m) => (
            <button
              key={m._id}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); insertMention(m); }}
              className="w-full text-left px-4 py-2 hover:bg-blue-50 transition-colors flex items-center gap-2"
            >
              <span className="text-sm font-medium text-gray-800">{m.name}</span>
              <span className="text-xs text-gray-400">{m.role}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
