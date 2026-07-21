// Runs a batch of parsed import rows through a save function, one at a time,
// and collects real error messages instead of silently swallowing them.
// A bare `catch {}` around each row (the old pattern used across every import
// page) meant a systemic bug — e.g. an import template posting the wrong
// field names — looked identical to "nothing to import": the loop finished,
// the count just stayed at zero, and nobody could tell why.

const MAX_ERRORS = 5;

// saveRow(row) should return a promise; reject with the original error to
// preserve the server's validation message.
export async function runImport(rows, saveRow, { onProgress } = {}) {
  let imported = 0;
  const errors = [];

  for (let i = 0; i < rows.length; i++) {
    try {
      await saveRow(rows[i]);
      imported++;
    } catch (err) {
      if (errors.length < MAX_ERRORS) {
        errors.push({
          row: i + 1,
          message: err?.response?.data?.message || err?.message || 'Failed to save',
        });
      }
    }
    onProgress?.(i + 1, rows.length);
  }

  return { imported, skipped: rows.length - imported, errors, total: rows.length };
}

export function summarize({ imported, skipped, errors, total }, noun = 'item') {
  let msg = `Imported ${imported} of ${total} ${noun}${total !== 1 ? 's' : ''}`;
  if (skipped > 0) {
    msg += `. ${skipped} skipped`;
    if (errors.length) {
      msg += ':\n' + errors.map(e => `Row ${e.row}: ${e.message}`).join('\n');
      if (skipped > errors.length) msg += `\n…and ${skipped - errors.length} more`;
    }
  }
  return msg;
}
