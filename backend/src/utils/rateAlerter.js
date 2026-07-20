// Flags a BOQ line item whose entered rate is well below the company's own
// QS Pricing Library rate for the same (or a very similar) item.
// Matching is a simple token-overlap (Jaccard) similarity on free text —
// there is no foreign-key link between a BOQ item and a QsPrice record.

const STOPWORDS = new Set(['the', 'a', 'an', 'of', 'to', 'and', 'or', 'for', 'with', 'in', 'on', 'per']);
const MATCH_THRESHOLD = 0.34;      // min Jaccard similarity to treat two items as "the same"
const BELOW_RATE_THRESHOLD = 0.85; // flag if entered rate is < 85% of the matched library rate

function normalizeTokens(text) {
  return (text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t && !STOPWORDS.has(t));
}

function jaccard(tokensA, tokensB) {
  if (!tokensA.length || !tokensB.length) return 0;
  const setA = new Set(tokensA);
  const setB = new Set(tokensB);
  let intersection = 0;
  for (const t of setA) if (setB.has(t)) intersection++;
  const union = new Set([...setA, ...setB]).size;
  return union ? intersection / union : 0;
}

function findBestMatch(itemText, qsPrices) {
  const tokens = normalizeTokens(itemText);
  let best = null;
  for (const price of qsPrices) {
    const score = jaccard(tokens, normalizeTokens(price.item));
    if (score >= MATCH_THRESHOLD && (!best || score > best.score)) {
      best = { price, score };
    }
  }
  return best;
}

// Returns null when there's no confident match or the rate isn't concerning.
function checkRate(item, qsPrices) {
  if (!item.baseCost || !qsPrices || !qsPrices.length) return null;

  const match = findBestMatch(`${item.item || ''} ${item.description || ''}`, qsPrices);
  if (!match || !match.price.price) return null;

  const libraryRate = match.price.price;
  const ratio = item.baseCost / libraryRate;
  if (ratio >= BELOW_RATE_THRESHOLD) return null;

  return {
    libraryItem: match.price.item,
    libraryRate,
    enteredRate: item.baseCost,
    belowPct: Math.round((1 - ratio) * 100),
    matchConfidence: Math.round(match.score * 100),
  };
}

module.exports = { checkRate };
