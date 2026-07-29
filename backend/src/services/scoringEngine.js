'use strict';

/**
 * scoringEngine.js
 * ─────────────────
 * Computes the 5 behavioral sub-metrics and the final ScoreZero score.
 *
 * Metric weights:
 *   Income Regularity   → 30%
 *   Savings Ratio       → 25%
 *   Spending Discipline → 20%
 *   Bounce Frequency    → 15%  (negative signal)
 *   Balance Trend       → 10%
 *
 * Bands:
 *   0–39   → Poor
 *   40–54  → Fair
 *   55–69  → Good
 *   70–84  → Very Good
 *   85–100 → Excellent
 */

/**
 * @param {Array<{date: string, description: string, amount: number,
 *   transaction_type: string, category: string, running_balance: number|null}>} transactions
 * @returns {{ income_regularity_score, savings_ratio_score, spending_discipline_score,
 *             bounce_frequency_score, balance_trend_score, score_value, score_band }}
 */
function calculateMetrics(transactions) {
  let totalIncome = 0;
  let totalEssential = 0;
  let totalDiscretionary = 0;
  let totalLoan = 0;
  let bounceCount = 0;
  const incomeDates = new Set();
  const balances = [];

  for (const t of transactions) {
    const amt = Math.abs(parseFloat(t.amount) || 0);
    const cat = t.category || '';

    if (cat === 'income') {
      totalIncome += amt;
      if (t.date) incomeDates.add(t.date);
    } else if (cat === 'essential_spend') {
      totalEssential += amt;
    } else if (cat === 'discretionary_spend') {
      totalDiscretionary += amt;
    } else if (cat === 'loan_repayment') {
      totalLoan += amt;
    } else if (cat === 'bounce_penalty') {
      bounceCount += 1;
    }

    if (t.running_balance != null) {
      balances.push(parseFloat(t.running_balance));
    }
  }

  const effectiveIncome = Math.max(totalIncome, 1);

  // ── 1. Income Regularity (0-100) ──────────────────────────────────────────
  // Based on number of distinct income event dates in the period.
  const incomeFreq = incomeDates.size;
  let incomeRegularity;
  if (incomeFreq === 0) incomeRegularity = 0;
  else if (incomeFreq === 1) incomeRegularity = 30;
  else if (incomeFreq === 2) incomeRegularity = 60;
  else if (incomeFreq === 3) incomeRegularity = 85;
  else incomeRegularity = 100;

  // ── 2. Savings Ratio (0-100) ──────────────────────────────────────────────
  // (Income - Total Spend) / Income, scaled to 0-100.
  // ≥20% savings → 100; 0% → 50; deeply negative → 0.
  const totalSpend = totalEssential + totalDiscretionary + totalLoan;
  const savings = totalIncome - totalSpend;
  const savingsRatioPct = (savings / effectiveIncome) * 100;

  let savingsRatioScore;
  if (savingsRatioPct >= 20) {
    savingsRatioScore = 100;
  } else if (savingsRatioPct > 0) {
    savingsRatioScore = 50 + (savingsRatioPct / 20) * 50;
  } else if (savingsRatioPct > -50) {
    savingsRatioScore = 50 - (Math.abs(savingsRatioPct) / 50) * 50;
  } else {
    savingsRatioScore = 0;
  }

  // ── 3. Spending Discipline (0-100) ────────────────────────────────────────
  // Discretionary spending as % of income.
  // ≤15% discretionary → 100; ≥50% → 0; linear between.
  const discRatioPct = (totalDiscretionary / effectiveIncome) * 100;
  let spendingDiscipline;
  if (discRatioPct <= 15) {
    spendingDiscipline = 100;
  } else if (discRatioPct >= 50) {
    spendingDiscipline = 0;
  } else {
    spendingDiscipline = 100 - ((discRatioPct - 15) / 35) * 100;
  }

  // ── 4. Bounce Frequency (0-100) ───────────────────────────────────────────
  // -20 pts per bounce from 100, floored at 0.
  const bounceScore = Math.max(0, 100 - bounceCount * 20);

  // ── 5. Balance Trend (0-100) ──────────────────────────────────────────────
  // Compare first vs last running balance if available; else use net cashflow.
  let balanceTrend;
  if (balances.length >= 2) {
    const startBal = balances[0];
    const endBal = balances[balances.length - 1];
    if (endBal > startBal) balanceTrend = 100;
    else if (endBal < startBal) balanceTrend = 20;
    else balanceTrend = 50;
  } else {
    // Proxy via net cashflow
    if (savings > 0) balanceTrend = 100;
    else if (savings > -500) balanceTrend = 50;
    else balanceTrend = 0;
  }

  // ── Weighted Final Score ──────────────────────────────────────────────────
  const finalScore = Math.round(
    Math.min(
      100,
      Math.max(
        0,
        incomeRegularity * 0.30 +
        savingsRatioScore * 0.25 +
        spendingDiscipline * 0.20 +
        bounceScore * 0.15 +
        balanceTrend * 0.10
      )
    )
  );

  // ── Band Assignment ───────────────────────────────────────────────────────
  let scoreBand;
  if (finalScore >= 85) scoreBand = 'Excellent';
  else if (finalScore >= 70) scoreBand = 'Very Good';
  else if (finalScore >= 55) scoreBand = 'Good';
  else if (finalScore >= 40) scoreBand = 'Fair';
  else scoreBand = 'Poor';

  return {
    income_regularity_score: Math.round(incomeRegularity),
    savings_ratio_score: Math.round(Math.max(0, Math.min(100, savingsRatioScore))),
    spending_discipline_score: Math.round(Math.max(0, Math.min(100, spendingDiscipline))),
    bounce_frequency_score: Math.round(bounceScore),
    balance_trend_score: Math.round(balanceTrend),
    score_value: finalScore,
    score_band: scoreBand,
  };
}

module.exports = { calculateMetrics };
