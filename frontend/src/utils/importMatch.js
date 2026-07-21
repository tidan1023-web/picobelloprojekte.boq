// Matches freshly-parsed import rows against already-loaded records so an
// import can update (PUT) an existing record instead of always creating a
// duplicate (POST). Matching is by exact, case-insensitive text match on one
// of a few candidate fields — there's no id column in a spreadsheet.

function normalizeKey(v) {
  return String(v ?? '').trim().toLowerCase();
}

// keyFields: ordered list of field names to try, e.g. ['item'] or ['email', 'name'].
// Returns rows with `_id` attached wherever a match was found.
export function matchExistingRecords(rows, existing, keyFields) {
  const index = new Map();
  for (const rec of existing || []) {
    for (const field of keyFields) {
      const key = normalizeKey(rec[field]);
      if (key && !index.has(key)) index.set(key, rec._id);
    }
  }

  return rows.map(row => {
    for (const field of keyFields) {
      const key = normalizeKey(row[field]);
      const matchId = key && index.get(key);
      if (matchId) return { ...row, _id: matchId };
    }
    return row;
  });
}
