// Matches a free-typed spreadsheet value against a strict backend enum.
// Backend enums are internal keys like 'semi_finished' or 'mid_range', but a
// normal user's spreadsheet — or values copied from this app's own dropdown
// labels, like "Semi-Finished" or "Mid-Range" — won't be typed that way. This
// closes that gap so imports don't fail validation over spelling/casing.

function normalize(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Returns the matching enum value, or the original raw value unchanged if
// nothing matches closely enough (so it still reaches the server and fails
// with a specific, visible message rather than being silently substituted).
export function matchEnumValue(rawValue, enumValues) {
  const norm = normalize(rawValue);
  if (!norm) return rawValue;

  const exact = enumValues.find((e) => normalize(e) === norm);
  if (exact) return exact;

  const containing = enumValues
    .filter((e) => { const ne = normalize(e); return norm.includes(ne) || ne.includes(norm); })
    .sort((a, b) => normalize(b).length - normalize(a).length);

  return containing[0] ?? rawValue;
}
