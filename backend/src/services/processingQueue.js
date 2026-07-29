'use strict';

/**
 * processingQueue.js
 * ───────────────────
 * Async processing pipeline for uploaded PDF statements.
 *
 * Flow:
 *   processUpload(uploadId, userId, pdfBuffer, fileName, fileSizeBytes)
 *     1. Parse PDF in-memory → transactions (PDF is NEVER stored)
 *     2. Calculate 5 behavioral metrics via scoringEngine
 *     3. Upsert score record in Supabase
 *     4. Generate AI recommendations via Groq (with timeout + fallback)
 *     5. Upsert recommendation record in Supabase
 *     6. Update upload status → 'completed' or 'low_confidence'
 *     On any error → update upload status → 'failed'
 */

const { extractTransactionsFromBuffer } = require('./pdfParser');
const { calculateMetrics } = require('./scoringEngine');
const { generateRecommendations } = require('./groqService');
const db = require('../db/supabaseDb');

/**
 * Run the full processing pipeline for a single upload.
 * Should be called with setImmediate() to avoid blocking the response.
 *
 * @param {string} uploadId
 * @param {string} userId
 * @param {Buffer} pdfBuffer - In-memory PDF bytes
 * @param {string|null} [password] - PDF password if encrypted
 */
async function processUpload(uploadId, userId, pdfBuffer, password = null) {
  console.log(`[processingQueue] Starting processing for upload ${uploadId}`);

  try {
    // ── Step 1: Parse PDF ──────────────────────────────────────────────────
    const parseResult = await extractTransactionsFromBuffer(pdfBuffer, password);
    const { transactions, lowConfidence, statementStartDate, statementEndDate } = parseResult;

    console.log(
      `[processingQueue] Parsed ${transactions.length} transactions for upload ${uploadId}. ` +
      `Low confidence: ${lowConfidence}`
    );

    // ── Step 2: Calculate metrics ──────────────────────────────────────────
    const metrics = calculateMetrics(transactions);
    console.log(`[processingQueue] Score for ${uploadId}: ${metrics.score_value} (${metrics.score_band})`);

    // ── Step 3: Persist score ──────────────────────────────────────────────
    const scoreRecord = await db.upsertScore({
      uploadId,
      userId,
      incomeRegularityScore: metrics.income_regularity_score,
      savingsRatioScore: metrics.savings_ratio_score,
      spendingDisciplineScore: metrics.spending_discipline_score,
      bounceFrequencyScore: metrics.bounce_frequency_score,
      balanceTrendScore: metrics.balance_trend_score,
      scoreValue: metrics.score_value,
      scoreBand: metrics.score_band,
    });

    console.log(`[processingQueue] Score persisted: ${scoreRecord.score_id}`);

    // ── Step 4: Generate AI recommendations ────────────────────────────────
    const recResult = await generateRecommendations(
      metrics,
      metrics.score_value,
      metrics.score_band
    );

    // ── Step 5: Persist recommendations ────────────────────────────────────
    await db.upsertRecommendation({
      scoreId: scoreRecord.score_id,
      explanationText: recResult.explanation_text,
      items: recResult.items,
      aiGenerated: recResult.ai_generated,
    });

    console.log(
      `[processingQueue] Recommendations saved (ai_generated: ${recResult.ai_generated}) for score ${scoreRecord.score_id}`
    );

    // ── Step 6: Mark upload complete ───────────────────────────────────────
    const finalStatus = lowConfidence ? 'low_confidence' : 'completed';
    await db.updateUploadStatus(uploadId, finalStatus, {
      statementStartDate,
      statementEndDate,
    });

    console.log(`[processingQueue] Upload ${uploadId} → status: ${finalStatus}`);
  } catch (err) {
    console.error(`[processingQueue] Processing failed for upload ${uploadId}:`, err.message);
    try {
      await db.updateUploadStatus(uploadId, 'failed');
    } catch (dbErr) {
      console.error(`[processingQueue] Could not update status to 'failed' for upload ${uploadId}:`, dbErr.message);
    }
  }
}

module.exports = { processUpload };
