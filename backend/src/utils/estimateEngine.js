// Multipliers relative to carcass (full scope = 1.0)
const CONDITION_MULT = {
  carcass:          1.00,
  advanced_carcass: 0.82,
  semi_finished:    0.55,
  finished:         0.18,
};

// Multipliers relative to basic (1.0)
const TIER_MULT = {
  basic:     1.00,
  mid_range: 1.45,
  premium:   2.10,
};

const REFERENCE_SIZE_M2 = 150;
const SIZE_EXPONENT     = 0.10;
const ANNUAL_INFLATION  = 0.18;  // Nigerian construction sector
const FALLBACK_BASE_RATE = 90000; // ₦/m² — carcass, basic, 150m², today

function sizeScaling(sizeM2) {
  return Math.pow(REFERENCE_SIZE_M2 / sizeM2, SIZE_EXPONENT);
}

function inflationFactor(completedYear) {
  const gap = new Date().getFullYear() - completedYear;
  return Math.pow(1 + ANNUAL_INFLATION, gap);
}

// Reverse-engineer what the project would cost as: carcass, basic, 150m², today
function normalizeToBase(project) {
  const rawRate = project.totalCost / project.sizeM2;
  const cMult   = CONDITION_MULT[project.condition] || 1;
  const tMult   = TIER_MULT[project.tier]           || 1;
  const sMult   = sizeScaling(project.sizeM2);
  const yFactor = inflationFactor(project.completedYear);
  return (rawRate * yFactor) / (cMult * tMult * sMult);
}

function removeOutliers(rates) {
  if (rates.length < 4) return rates;
  const sorted = [...rates].sort((a, b) => a - b);
  const q1  = sorted[Math.floor(sorted.length * 0.25)];
  const q3  = sorted[Math.floor(sorted.length * 0.75)];
  const iqr = q3 - q1;
  return rates.filter(r => r >= q1 - 1.5 * iqr && r <= q3 + 1.5 * iqr);
}

function buildResult(baseRate, { sizeM2, condition, tier }, meta) {
  const cMult = CONDITION_MULT[condition];
  const tMult = TIER_MULT[tier];
  const sMult = sizeScaling(sizeM2);

  const makeEst = (t) => {
    const rate = baseRate * CONDITION_MULT[condition] * TIER_MULT[t] * sMult;
    return { rate, total: rate * sizeM2 };
  };

  return {
    ...meta,
    baseRate,
    conditionMultiplier: cMult,
    tierMultiplier:      tMult,
    sizeMultiplier:      sMult,
    finalRate:           baseRate * cMult * tMult * sMult,
    totalCost:           baseRate * cMult * tMult * sMult * sizeM2,
    basicEstimate:       makeEst('basic'),
    midRangeEstimate:    makeEst('mid_range'),
    premiumEstimate:     makeEst('premium'),
  };
}

function runEngine(projects, params) {
  if (!projects || projects.length === 0) {
    return buildResult(FALLBACK_BASE_RATE, params, {
      projectsTotal:   0,
      projectsUsed:    0,
      outliersRemoved: 0,
      dataSource:      'fallback',
    });
  }

  const allRates   = projects.map(normalizeToBase);
  const cleanRates = removeOutliers(allRates);
  const baseRate   = cleanRates.reduce((s, r) => s + r, 0) / cleanRates.length;

  return buildResult(baseRate, params, {
    projectsTotal:   projects.length,
    projectsUsed:    cleanRates.length,
    outliersRemoved: projects.length - cleanRates.length,
    dataSource:      'historical',
  });
}

module.exports = { runEngine, CONDITION_MULT, TIER_MULT };
