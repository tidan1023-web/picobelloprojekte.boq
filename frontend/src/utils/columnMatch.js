// Auto-matches the headers actually present in an uploaded spreadsheet against
// the columns our import expects. A real QS's file is very unlikely to use our
// exact header wording ("Price (₦)" vs "Rate" vs "Unit Cost"), so requiring an
// exact match silently drops the column and every row fails. This gives a
// best-guess match that the user can see and correct before importing.

// Common construction/spreadsheet abbreviations a QS is likely to use instead
// of our exact wording. Each group is treated as interchangeable words.
const SYNONYM_GROUPS = [
  ['price', 'rate', 'cost', 'unitrate', 'unitprice', 'unitcost'],
  ['unit', 'uom', 'units'],
  ['qty', 'quantity'],
  ['desc', 'description', 'particulars'],
  ['category', 'trade', 'section', 'type'],
  ['name', 'title'],
  ['amount', 'total', 'value'],
  ['phone', 'tel', 'telephone', 'mobile', 'contact'],
  ['location', 'site', 'address'],
];
const SYNONYM_OF = new Map();
for (const group of SYNONYM_GROUPS) {
  for (const word of group) SYNONYM_OF.set(word, group[0]);
}

function normalize(s) {
  const words = String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .map((w) => SYNONYM_OF.get(w) || w);
  return words.join(' ');
}

// 1 = identical, 0.8 = one contains the other, else word-overlap ratio.
function similarity(a, b) {
  const na = normalize(a), nb = normalize(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  if (na.includes(nb) || nb.includes(na)) return 0.8;
  const ta = na.split(' ').filter(Boolean);
  const tb = nb.split(' ').filter(Boolean);
  const setB = new Set(tb);
  const overlap = ta.filter((t) => setB.has(t)).length;
  const union = new Set([...ta, ...tb]).size;
  return union ? (overlap / union) * 0.7 : 0;
}

const MIN_SCORE = 0.5;

// columns: [{ key, label }]  headers: string[] (from the uploaded file)
// Returns { [columnKey]: matchedHeader | null }
export function autoMatchColumns(columns, headers) {
  const mapping = {};
  const used = new Set();
  for (const col of columns) {
    let best = null;
    let bestScore = 0;
    for (const header of headers) {
      if (used.has(header)) continue;
      const score = similarity(col.label, header);
      if (score > bestScore) { bestScore = score; best = header; }
    }
    mapping[col.key] = bestScore >= MIN_SCORE ? best : null;
    if (mapping[col.key]) used.add(mapping[col.key]);
  }
  return mapping;
}
