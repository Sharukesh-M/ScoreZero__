'use strict';

/**
 * groqService.js
 * ──────────────
 * Generates AI recommendations via the Groq API (Mixtral-8x7b-32768).
 * Falls back to rule-based recommendations if:
 *   - GROQ_API_KEY is not set
 *   - API call exceeds GROQ_TIMEOUT_MS (default 4000ms)
 *   - Any network/parse error occurs
 */

const Groq = require('groq-sdk');
const config = require('../config');

// ─── Fallback: rule-based recommendations ────────────────────────────────────

function generateFallbackRecommendations(metrics, scoreValue, scoreBand) {
  const recs = [];
  const thresholds = [
    {
      key: 'income_regularity_score',
      label: 'Income Regularity',
      tip: 'Try to stabilize your income by securing a consistent payment schedule. Regular deposits significantly boost your score.',
    },
    {
      key: 'savings_ratio_score',
      label: 'Savings Ratio',
      tip: 'Aim to save at least 10–20% of each deposit before spending on non-essentials. Even small savings improve your ratio quickly.',
    },
    {
      key: 'spending_discipline_score',
      label: 'Spending Discipline',
      tip: 'Your discretionary spending is high relative to your income. Track daily expenses and set a monthly cap on non-essential purchases.',
    },
    {
      key: 'bounce_frequency_score',
      label: 'Bounce Frequency',
      tip: 'Avoid overdrafts and failed transactions. Set up low-balance SMS alerts with your bank — even one bounce costs 20 points.',
    },
    {
      key: 'balance_trend_score',
      label: 'Balance Trend',
      tip: 'Your end-of-month balance is declining. Review your top 3 expense categories and look for areas to cut back this month.',
    },
  ];

  // Sort by weakest metric first
  const sorted = thresholds
    .filter((t) => metrics[t.key] != null)
    .sort((a, b) => (metrics[a.key] || 0) - (metrics[b.key] || 0));

  for (const item of sorted.slice(0, 3)) {
    if (metrics[item.key] < 80) {
      recs.push(item.tip);
    }
  }

  // Pad if all metrics are strong
  if (recs.length === 0) {
    recs.push('Your financial habits look excellent. Keep maintaining your current budget.');
    recs.push('Consider investing your surplus savings for long-term growth.');
    recs.push('Ensure you have an emergency fund covering 3–6 months of expenses.');
  }

  while (recs.length < 3) {
    recs.push('Continue monitoring your monthly statement to maintain healthy financial habits.');
  }

  const explanation =
    `Your ScoreZero score of ${scoreValue}/100 (${scoreBand}) reflects your financial behaviour over this period. ` +
    `Focus on the recommendations below to see the biggest improvement.`;

  return {
    explanation_text: explanation,
    items: recs.slice(0, 4),
    ai_generated: false,
  };
}

// ─── Groq API call ────────────────────────────────────────────────────────────

async function generateRecommendations(metrics, scoreValue, scoreBand) {
  // If no API key, skip straight to fallback
  if (!config.groqApiKey) {
    console.warn('[groqService] GROQ_API_KEY not set — using rule-based fallback');
    return generateFallbackRecommendations(metrics, scoreValue, scoreBand);
  }

  const prompt = `You are a financial advisor helping someone understand their alternative credit score.
The user's ScoreZero Score is ${scoreValue}/100 (${scoreBand}).

Their financial metrics are:
- Income Regularity: ${metrics.income_regularity_score}/100 (consistency of income deposits)
- Savings Ratio: ${metrics.savings_ratio_score}/100 (percentage of income saved)
- Spending Discipline: ${metrics.spending_discipline_score}/100 (essential vs discretionary ratio)
- Bounce Frequency: ${metrics.bounce_frequency_score}/100 (penalty/overdraft count — higher is better)
- Balance Trend: ${metrics.balance_trend_score}/100 (improving/declining balance)

Provide:
1. A 2-sentence explanation of what the score means for this user
2. Exactly 3 specific, actionable recommendations targeting their weakest metrics

Respond ONLY with valid JSON in this exact format (no markdown, no extra text):
{
  "explanation": "...",
  "recommendations": [
    "...",
    "...",
    "..."
  ]
}`;

  try {
    const groq = new Groq({ apiKey: config.groqApiKey });

    // AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.groqTimeoutMs);

    let responseText = '';
    try {
      const completion = await groq.chat.completions.create(
        {
          model: config.groqModel,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 600,
          temperature: 0.4,
        },
        { signal: controller.signal }
      );

      responseText = completion.choices?.[0]?.message?.content || '';
    } finally {
      clearTimeout(timeoutId);
    }

    if (!responseText) throw new Error('Empty response from Groq');

    // Strip any accidental markdown code fences
    const cleaned = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned);

    const explanation = typeof parsed.explanation === 'string' ? parsed.explanation : '';
    const recommendations = Array.isArray(parsed.recommendations) ? parsed.recommendations : [];

    if (!explanation || recommendations.length < 3) {
      throw new Error('Groq response missing required fields');
    }

    console.log('[groqService] AI recommendations generated successfully');
    return {
      explanation_text: explanation,
      items: recommendations.slice(0, 4),
      ai_generated: true,
    };
  } catch (err) {
    const reason = err.name === 'AbortError' ? 'timeout' : err.message;
    console.warn(`[groqService] Groq API failed (${reason}) — using rule-based fallback`);
    return generateFallbackRecommendations(metrics, scoreValue, scoreBand);
  }
}

module.exports = { generateRecommendations, generateFallbackRecommendations };
