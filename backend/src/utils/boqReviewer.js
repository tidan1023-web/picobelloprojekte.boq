// Rule-based checklist: for each trade that already has line items in the BOQ
// (i.e. is clearly in scope), flags commonly-paired items that appear to be
// missing. Purely keyword-based against the free-text item/description —
// there is no structured "trade" field on a BOQ item to key off instead.

const TRADE_CHECKLISTS = [
  {
    trade: 'Preliminaries',
    keywords: ['mobiliz', 'mobilis', 'preliminaries', 'site office', 'site clearance'],
    expectedItems: [
      { label: 'Site clearance', keywords: ['site clearance', 'clearing'] },
      { label: 'Temporary fencing / hoarding', keywords: ['hoarding', 'temporary fence', 'temporary fencing'] },
      { label: 'Site signage', keywords: ['signage', 'signboard'] },
    ],
  },
  {
    trade: 'Concrete Works',
    keywords: ['concrete', 'foundation', 'reinforcement', 'formwork', 'rebar'],
    expectedItems: [
      { label: 'Reinforcement / rebar', keywords: ['reinforcement', 'rebar', 'bar bending'] },
      { label: 'Formwork / shuttering', keywords: ['formwork', 'shuttering'] },
      { label: 'Damp proof membrane', keywords: ['damp proof membrane', 'dpm'] },
    ],
  },
  {
    trade: 'Masonry & Blockwork',
    keywords: ['block', 'brick', 'masonry', 'blockwork'],
    expectedItems: [
      { label: 'Damp proof course', keywords: ['damp proof course', 'dpc'] },
      { label: 'Lintels', keywords: ['lintel'] },
    ],
  },
  {
    trade: 'Roofing & Waterproofing',
    keywords: ['roof', 'waterproof'],
    expectedItems: [
      { label: 'Gutters & downpipes', keywords: ['gutter', 'downpipe', 'down pipe'] },
      { label: 'Fascia / barge board', keywords: ['fascia', 'barge board'] },
      { label: 'Roof insulation', keywords: ['insulation'] },
    ],
  },
  {
    trade: 'Tiling & Flooring',
    keywords: ['tile', 'tiling', 'screed', 'flooring'],
    expectedItems: [
      { label: 'Skirting', keywords: ['skirting'] },
      { label: 'Screeding', keywords: ['screed'] },
      { label: 'Floor levelling / damp proofing', keywords: ['damp proof', 'levelling', 'leveling'] },
    ],
  },
  {
    trade: 'Painting & Decorating',
    keywords: ['paint', 'decorat'],
    expectedItems: [
      { label: 'Surface preparation', keywords: ['preparation', 'sanding', 'filling'] },
      { label: 'Primer / undercoat', keywords: ['primer', 'undercoat'] },
    ],
  },
  {
    trade: 'Doors & Windows',
    keywords: ['door', 'window'],
    expectedItems: [
      { label: 'Ironmongery / door furniture', keywords: ['ironmongery', 'door furniture', 'handle', 'hinge'] },
      { label: 'Glazing', keywords: ['glazing', 'glass'] },
    ],
  },
  {
    trade: 'Mechanical & Plumbing',
    keywords: ['plumb', 'water supply', 'drainage', 'sanitary', 'pipe', 'wc', 'toilet', 'basin'],
    expectedItems: [
      { label: 'Testing & commissioning', keywords: ['testing', 'commissioning'] },
      { label: 'Stop valves / isolation valves', keywords: ['stop valve', 'isolation valve', 'gate valve'] },
      { label: 'Water heater', keywords: ['water heater', 'geyser'] },
      { label: 'Soak-away / septic system', keywords: ['soak away', 'soakaway', 'septic'] },
    ],
  },
  {
    trade: 'Electrical',
    keywords: ['electric', 'wiring', 'cable', 'socket', 'switch', 'distribution board'],
    expectedItems: [
      { label: 'Testing & commissioning', keywords: ['testing', 'commissioning'] },
      { label: 'Earthing / lightning protection', keywords: ['earth', 'lightning'] },
      { label: 'Distribution board', keywords: ['distribution board', 'db board', 'panel board'] },
      { label: 'Light fittings', keywords: ['light fitting', 'luminaire', 'light point'] },
    ],
  },
  {
    trade: 'External Works',
    keywords: ['landscap', 'paving', 'external works', 'boundary'],
    expectedItems: [
      { label: 'Drainage channel', keywords: ['drainage channel', 'french drain'] },
      { label: 'Boundary fencing / gate', keywords: ['fence', 'fencing', 'gate'] },
    ],
  },
];

function textOf(item) {
  return `${item.item || ''} ${item.description || ''}`.toLowerCase();
}

function containsAny(text, keywords) {
  return keywords.some(k => text.includes(k));
}

// Returns [{ trade, missingItems: [label, ...] }] for trades that are
// clearly in scope (>=1 matching item already present) but missing one
// or more commonly-paired items.
function reviewBoq(items) {
  const texts = (items || []).map(textOf);
  const combined = texts.join(' | ');
  const missing = [];

  for (const { trade, keywords, expectedItems } of TRADE_CHECKLISTS) {
    const inScope = texts.some(t => containsAny(t, keywords));
    if (!inScope) continue;

    const missingItems = expectedItems.filter(exp => !containsAny(combined, exp.keywords)).map(exp => exp.label);
    if (missingItems.length) missing.push({ trade, missingItems });
  }

  return missing;
}

module.exports = { reviewBoq };
