'use strict';

/**
 * routes/scores.js
 * ─────────────────
 * Score history and report generation.
 *
 * GET  /scores/latest        → Most recent score + full metrics
 * GET  /scores/history       → Paginated score list (?limit&offset)
 * GET  /scores/:scoreId      → Single score with recommendations
 * POST /scores/:uploadId/report → Generate signed PDF report URL
 */

const { Router } = require('express');
const { requireAuth } = require('../middleware/auth');
const db = require('../db/supabaseDb');

const router = Router();

// ─── GET /scores/latest ───────────────────────────────────────────────────────
router.get('/latest', requireAuth, async (req, res, next) => {
  try {
    const score = await db.getLatestScore(req.userId);
    if (!score) {
      return res.status(200).json({ score: null });
    }

    // Fetch recommendations if available
    const recommendation = await db.getRecommendation(score.score_id);

    return res.status(200).json({
      score: {
        score_id: score.score_id,
        upload_id: score.upload_id,
        score_value: score.score_value,
        score_band: score.score_band,
        calculated_at: score.calculated_at,
        metrics: {
          income_regularity: score.income_regularity_score,
          savings_ratio: score.savings_ratio_score,
          spending_discipline: score.spending_discipline_score,
          bounce_frequency: score.bounce_frequency_score,
          balance_trend: score.balance_trend_score,
        },
        explanation: recommendation?.explanation_text || null,
        recommendations: recommendation?.items || [],
        ai_generated: recommendation?.ai_generated || false,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /scores/history ──────────────────────────────────────────────────────
router.get('/history', requireAuth, async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || '10', 10), 50);
    const offset = Math.max(parseInt(req.query.offset || '0', 10), 0);

    const { scores, totalCount } = await db.getScoreHistory(req.userId, { limit, offset });

    return res.status(200).json({ scores, total_count: totalCount });
  } catch (err) {
    next(err);
  }
});

// ─── GET /scores/:scoreId ─────────────────────────────────────────────────────
router.get('/:scoreId', requireAuth, async (req, res, next) => {
  try {
    const score = await db.getScoreById(req.params.scoreId, req.userId);
    if (!score) {
      return res.status(404).json({ error: 'Score not found.', code: 'NOT_FOUND' });
    }

    const recommendation = await db.getRecommendation(score.score_id);

    return res.status(200).json({
      score: {
        score_id: score.score_id,
        upload_id: score.upload_id,
        score_value: score.score_value,
        score_band: score.score_band,
        calculated_at: score.calculated_at,
        metrics: {
          income_regularity: score.income_regularity_score,
          savings_ratio: score.savings_ratio_score,
          spending_discipline: score.spending_discipline_score,
          bounce_frequency: score.bounce_frequency_score,
          balance_trend: score.balance_trend_score,
        },
        explanation: recommendation?.explanation_text || null,
        recommendations: recommendation?.items || [],
        ai_generated: recommendation?.ai_generated || false,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ─── POST /scores/:uploadId/report ────────────────────────────────────────────
// Returns a JSON summary of the score as a "report" (no PDF generation in this route).
// The frontend can use this to render/download.
router.post('/:uploadId/report', requireAuth, async (req, res, next) => {
  try {
    const { uploadId } = req.params;

    // Find score by upload_id (scoped to user)
    const { scores } = await db.getScoreHistory(req.userId, { limit: 100, offset: 0 });
    const score = scores.find((s) => s.upload_id === uploadId);

    if (!score) {
      return res.status(404).json({ error: 'No score found for this upload.', code: 'NOT_FOUND' });
    }

    const fullScore = await db.getScoreById(score.score_id, req.userId);
    const recommendation = await db.getRecommendation(score.score_id);

    // Return report data as JSON — frontend renders/downloads
    return res.status(200).json({
      report: {
        generated_at: new Date().toISOString(),
        score_id: fullScore.score_id,
        score_value: fullScore.score_value,
        score_band: fullScore.score_band,
        calculated_at: fullScore.calculated_at,
        metrics: {
          income_regularity: fullScore.income_regularity_score,
          savings_ratio: fullScore.savings_ratio_score,
          spending_discipline: fullScore.spending_discipline_score,
          bounce_frequency: fullScore.bounce_frequency_score,
          balance_trend: fullScore.balance_trend_score,
        },
        explanation: recommendation?.explanation_text || null,
        recommendations: recommendation?.items || [],
        ai_generated: recommendation?.ai_generated || false,
        disclaimer:
          'ScoreZero is not an official credit bureau score. It provides behavioural insights based on bank statement data and should not be used for lending decisions.',
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
