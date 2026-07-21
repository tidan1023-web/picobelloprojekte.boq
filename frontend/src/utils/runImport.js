// Runs a batch of parsed import rows through a save function, in bounded-
// concurrency batches, and collects real error messages instead of silently
// swallowing them. A bare `catch {}` around each row (the old pattern used
// across every import page) meant a systemic bug — e.g. an import template
// posting the wrong field names — looked identical to "nothing to import":
// the loop finished, the count just stayed at zero, and nobody could tell why.

const MAX_ERRORS = 5;
const DEFAULT_CONCURRENCY = 6; // rows are independent POST/PUT calls — safe to parallelize

// The backend's error handler returns { message, errors: [{ field, message }] }
// for Mongoose validation failures — `message` alone is always the generic
// "Validation failed", so the field-level detail has to be pulled in too.
function extractMessage(err) {
  const data = err?.response?.data;
  let message = data?.message || err?.message || 'Failed to save';
  if (data?.errors?.length) {
    message += ': ' + data.errors.map((e) => `${e.field} — ${e.message}`).join(', ');
  }
  return message;
}

// saveRow(row) should return a promise; reject with the original error to
// preserve the server's validation message.
export async function runImport(rows, saveRow, { onProgress, concurrency = DEFAULT_CONCURRENCY } = {}) {
  let imported = 0;
  let completed = 0;
  const errors = [];

  for (let start = 0; start < rows.length; start += concurrency) {
    const batch = rows.slice(start, start + concurrency);
    const results = await Promise.allSettled(batch.map((row) => saveRow(row)));

    results.forEach((result, i) => {
      completed++;
      if (result.status === 'fulfilled') {
        imported++;
      } else if (errors.length < MAX_ERRORS) {
        errors.push({ row: start + i + 1, message: extractMessage(result.reason) });
      }
      onProgress?.(completed, rows.length);
    });
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
