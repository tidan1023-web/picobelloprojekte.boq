// Lightweight rule-based reader for a free-text project description.
// Suggests condition/tier/includes and drafts scope assumptions & exclusions —
// entirely client-side, no external AI call.

const CONDITION_KEYWORDS = [
  { id: 'finished',         words: ['renovat', 'refurbish', 'facelift', 'repaint', 'upgrade', 'already finished', 'old house', 'existing house', 'refresh'] },
  { id: 'semi_finished',    words: ['semi finish', 'semi-finish', 'plastered', 'wired', 'plumbed', 'mep done', 'needs paint', 'needs floor'] },
  { id: 'advanced_carcass', words: ['advanced carcass', 'roofed', 'shell complete', 'windows and doors done', 'external finished'] },
  { id: 'carcass',          words: ['carcass', 'shell', 'bare structure', 'foundation to roof', 'structure only', 'unfinished shell'] },
];

const TIER_KEYWORDS = [
  { id: 'premium',   words: ['luxury', 'premium', 'high end', 'high-end', 'bespoke', 'exquisite', 'top notch', 'top-notch'] },
  { id: 'mid_range', words: ['mid range', 'mid-range', 'modern', 'smart finish', 'good quality', 'nice finish'] },
  { id: 'basic',     words: ['basic', 'budget', 'affordable', 'economy', 'low cost', 'low-cost', 'standard finish'] },
];

const INCLUDES_KEYWORDS = {
  includesFurniture: ['furniture', 'furnished'],
  includesKitchen:   ['kitchen'],
  includesWardrobes: ['wardrobe', 'closet', 'built-in cupboard'],
};

const SIZE_REGEX = /(\d{2,5}(?:\.\d+)?)\s*(?:m2|m²|sqm|sq m|square met)/i;

const CONDITION_TEXT = {
  carcass:          'Work begins from carcass stage — structure and blockwork complete; all MEP, finishes, doors, windows, and fittings are still required.',
  advanced_carcass: 'External shell is complete (structure, external finishes, doors, windows); scope covers internal finishes and MEP only.',
  semi_finished:    'Structure, MEP rough-in, plaster, and ceiling are already in place; scope covers floor finishes, paint, fittings, and final works.',
  finished:         'Property is complete and habitable; scope covers refresh works only — repainting, decoration, and updated fittings/fixtures.',
};

const TIER_TEXT = {
  basic:     'Standard fittings and finishes throughout — mid-spec tiles, basic sanitaryware, economy kitchen.',
  mid_range: 'Good quality fittings and imported tiles, well-equipped kitchen, quality sanitaryware.',
  premium:   'High-end, bespoke finishes — porcelain/marble, premium sanitaryware, custom kitchen.',
};

function matchKeyword(text, table) {
  const lower = text.toLowerCase();
  for (const { id, words } of table) {
    if (words.some(w => lower.includes(w))) return id;
  }
  return null;
}

export function suggestFromDescription(description) {
  const text = (description || '').trim();
  if (!text) return null;

  const condition = matchKeyword(text, CONDITION_KEYWORDS);
  const tier       = matchKeyword(text, TIER_KEYWORDS);
  const sizeMatch  = text.match(SIZE_REGEX);
  const sizeM2     = sizeMatch ? Number(sizeMatch[1]) : null;

  const includes = {};
  for (const [key, words] of Object.entries(INCLUDES_KEYWORDS)) {
    includes[key] = words.some(w => text.toLowerCase().includes(w));
  }

  return { condition, tier, sizeM2, includes };
}

export function buildScopeAssumptions(condition, tier, includes = {}) {
  const parts = [CONDITION_TEXT[condition], TIER_TEXT[tier]].filter(Boolean);
  const extras = [];
  if (includes.includesFurniture) extras.push('loose furniture supply');
  if (includes.includesKitchen)   extras.push('fitted kitchen');
  if (includes.includesWardrobes) extras.push('built-in wardrobes');
  if (extras.length) parts.push(`Scope includes ${extras.join(', ')}.`);
  return parts.join(' ');
}

export function buildExclusions(condition, includes = {}) {
  const items = ['External landscaping and boundary fencing', 'Generator and standby power installation', 'Security systems (CCTV, alarm, access control)'];
  if (!includes.includesKitchen)   items.unshift('Fitted kitchen units and appliances');
  if (!includes.includesWardrobes) items.unshift('Built-in wardrobes');
  if (!includes.includesFurniture) items.unshift('Loose furniture and soft furnishings');
  if (condition === 'finished') items.push('Structural alterations or MEP rerouting');
  return items.join('. ') + '.';
}
