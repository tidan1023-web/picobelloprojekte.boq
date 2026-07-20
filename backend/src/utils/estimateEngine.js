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
const DEFAULT_SPREAD    = 0.15;   // ± range used when there isn't enough data to measure variance
const MIN_SPREAD        = 0.08;
const MAX_SPREAD        = 0.35;
const MAX_COMPARABLES   = 3;

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

function stddev(rates, mean) {
  if (rates.length < 2) return 0;
  const variance = rates.reduce((s, r) => s + (r - mean) ** 2, 0) / (rates.length - 1);
  return Math.sqrt(variance);
}

// How tightly the historical rates agree with each other → confidence in the estimate
function confidenceFor(dataSource, projectsUsed, coefficientOfVariation) {
  if (dataSource === 'manual')   return 'manual';
  if (dataSource === 'fallback') return 'low';
  if (projectsUsed < 3)          return 'low';
  if (coefficientOfVariation <= 0.15) return 'high';
  if (coefficientOfVariation <= 0.35) return 'medium';
  return 'low';
}

// How wide the low/high range should be around the point estimate
function spreadFor(dataSource, coefficientOfVariation) {
  if (dataSource === 'historical') {
    return Math.min(Math.max(coefficientOfVariation, MIN_SPREAD), MAX_SPREAD);
  }
  return DEFAULT_SPREAD;
}

// Rank historical projects by similarity (condition, tier, size) and report how their
// normalized rate compares to the base rate used for this estimate
function topComparables(projects, params, baseRate) {
  if (!projects || !projects.length) return [];

  return projects
    .map(project => {
      let score = 0;
      if (project.condition === params.condition) score += 2;
      if (project.tier === params.tier)           score += 1;
      const sizeDiffRatio = Math.abs(project.sizeM2 - params.sizeM2) / Math.max(params.sizeM2, 1);
      score -= Math.min(sizeDiffRatio, 2);

      const normalizedRate = normalizeToBase(project);
      const rateDeltaPct = baseRate ? ((normalizedRate - baseRate) / baseRate) * 100 : 0;

      return {
        id:            project._id,
        name:          project.name,
        location:      project.location,
        sizeM2:        project.sizeM2,
        condition:     project.condition,
        tier:          project.tier,
        totalCost:     project.totalCost,
        completedYear: project.completedYear,
        rateDeltaPct:  Math.round(rateDeltaPct * 10) / 10,
        score,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_COMPARABLES)
    .map(({ score, ...comparable }) => comparable);
}

function buildResult(baseRate, { sizeM2, condition, tier }, meta) {
  const cMult  = CONDITION_MULT[condition];
  const tMult  = TIER_MULT[tier];
  const sMult  = sizeScaling(sizeM2);
  const spread = meta.spread ?? DEFAULT_SPREAD;

  const makeEst = (t) => {
    const rate  = baseRate * CONDITION_MULT[condition] * TIER_MULT[t] * sMult;
    const total = rate * sizeM2;
    return {
      rate, total,
      rateLow:   rate  * (1 - spread),
      rateHigh:  rate  * (1 + spread),
      totalLow:  total * (1 - spread),
      totalHigh: total * (1 + spread),
    };
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

function runEngine(projects, params, options = {}) {
  const comparableProjects = topComparables(projects, params, null);

  if (options.manualBaseRate && options.manualBaseRate > 0) {
    const result = buildResult(options.manualBaseRate, params, {
      projectsTotal:   (projects || []).length,
      projectsUsed:    0,
      outliersRemoved: 0,
      dataSource:      'manual',
      confidence:      'manual',
      spread:          DEFAULT_SPREAD,
    });
    result.comparableProjects = topComparables(projects, params, options.manualBaseRate);
    return result;
  }

  if (!projects || projects.length === 0) {
    return buildResult(FALLBACK_BASE_RATE, params, {
      projectsTotal:   0,
      projectsUsed:    0,
      outliersRemoved: 0,
      dataSource:      'fallback',
      confidence:      'low',
      spread:          DEFAULT_SPREAD,
      comparableProjects: [],
    });
  }

  const allRates   = projects.map(normalizeToBase);
  const cleanRates = removeOutliers(allRates);
  const baseRate   = cleanRates.reduce((s, r) => s + r, 0) / cleanRates.length;
  const sd         = stddev(cleanRates, baseRate);
  const cv         = baseRate ? sd / baseRate : 0;

  const result = buildResult(baseRate, params, {
    projectsTotal:   projects.length,
    projectsUsed:    cleanRates.length,
    outliersRemoved: projects.length - cleanRates.length,
    dataSource:      'historical',
    confidence:      confidenceFor('historical', cleanRates.length, cv),
    spread:          spreadFor('historical', cv),
  });
  result.comparableProjects = topComparables(projects, params, baseRate);
  return result;
}

module.exports = { runEngine, CONDITION_MULT, TIER_MULT };
