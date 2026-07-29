'use strict';

/**
 * supabaseDb.js
 * ─────────────
 * All database access through the Supabase JS client.
 * Only scores and recommendations are persisted — no uploads or PDFs stored.
 */

const { supabaseAdmin } = require('../services/supabaseClient');

// ─── Uploads ────────────────────────────────────────────────────────────────

/**
 * Create an upload tracking record (status only — no file data stored).
 */
async function createUpload({ uploadId, userId, fileName, fileSizeBytes }) {
  const { data, error } = await supabaseAdmin
    .from('uploads')
    .insert({
      upload_id: uploadId,
      user_id: userId,
      file_name: fileName,
      file_path: `memory://${uploadId}`, // Placeholder — file is not stored
      file_size_bytes: fileSizeBytes,
      status: 'processing',
    })
    .select()
    .single();

  if (error) throw new Error(`DB createUpload failed: ${error.message}`);
  return data;
}

/**
 * Update upload status and optional date range.
 */
async function updateUploadStatus(uploadId, status, { statementStartDate, statementEndDate } = {}) {
  const patch = { status };
  if (statementStartDate) patch.statement_start_date = statementStartDate;
  if (statementEndDate) patch.statement_end_date = statementEndDate;

  const { error } = await supabaseAdmin
    .from('uploads')
    .update(patch)
    .eq('upload_id', uploadId);

  if (error) throw new Error(`DB updateUploadStatus failed: ${error.message}`);
}

/**
 * Get a single upload record by ID, scoped to userId.
 */
async function getUpload(uploadId, userId) {
  const { data, error } = await supabaseAdmin
    .from('uploads')
    .select('*')
    .eq('upload_id', uploadId)
    .eq('user_id', userId)
    .is('deleted_at', null)
    .single();

  if (error && error.code !== 'PGRST116') throw new Error(`DB getUpload failed: ${error.message}`);
  return data || null;
}

/**
 * Soft-delete an upload (set deleted_at timestamp).
 */
async function softDeleteUpload(uploadId, userId) {
  const { error } = await supabaseAdmin
    .from('uploads')
    .update({ deleted_at: new Date().toISOString() })
    .eq('upload_id', uploadId)
    .eq('user_id', userId);

  if (error) throw new Error(`DB softDeleteUpload failed: ${error.message}`);
}

/**
 * List all non-deleted uploads for a user.
 */
async function listUploads(userId) {
  const { data, error } = await supabaseAdmin
    .from('uploads')
    .select('upload_id, file_name, status, uploaded_at')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .order('uploaded_at', { ascending: false });

  if (error) throw new Error(`DB listUploads failed: ${error.message}`);
  return data || [];
}

// ─── Scores ─────────────────────────────────────────────────────────────────

/**
 * Upsert a score record for a given upload.
 */
async function upsertScore({
  uploadId,
  userId,
  incomeRegularityScore,
  savingsRatioScore,
  spendingDisciplineScore,
  bounceFrequencyScore,
  balanceTrendScore,
  scoreValue,
  scoreBand,
}) {
  const { data, error } = await supabaseAdmin
    .from('scores')
    .upsert(
      {
        upload_id: uploadId,
        user_id: userId,
        income_regularity_score: incomeRegularityScore,
        savings_ratio_score: savingsRatioScore,
        spending_discipline_score: spendingDisciplineScore,
        bounce_frequency_score: bounceFrequencyScore,
        balance_trend_score: balanceTrendScore,
        score_value: scoreValue,
        score_band: scoreBand,
        calculated_at: new Date().toISOString(),
      },
      { onConflict: 'upload_id' }
    )
    .select()
    .single();

  if (error) throw new Error(`DB upsertScore failed: ${error.message}`);
  return data;
}

/**
 * Get the latest score for a user.
 */
async function getLatestScore(userId) {
  const { data, error } = await supabaseAdmin
    .from('scores')
    .select(
      `
      score_id,
      upload_id,
      score_value,
      score_band,
      income_regularity_score,
      savings_ratio_score,
      spending_discipline_score,
      bounce_frequency_score,
      balance_trend_score,
      calculated_at
    `
    )
    .eq('user_id', userId)
    .order('calculated_at', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') throw new Error(`DB getLatestScore failed: ${error.message}`);
  return data || null;
}

/**
 * Get paginated score history for a user.
 */
async function getScoreHistory(userId, { limit = 10, offset = 0 } = {}) {
  const { data, error, count } = await supabaseAdmin
    .from('scores')
    .select('score_id, upload_id, score_value, score_band, calculated_at', { count: 'exact' })
    .eq('user_id', userId)
    .order('calculated_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw new Error(`DB getScoreHistory failed: ${error.message}`);
  return { scores: data || [], totalCount: count || 0 };
}

/**
 * Get a score by its ID, scoped to a user.
 */
async function getScoreById(scoreId, userId) {
  const { data, error } = await supabaseAdmin
    .from('scores')
    .select('*')
    .eq('score_id', scoreId)
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') throw new Error(`DB getScoreById failed: ${error.message}`);
  return data || null;
}

// ─── Recommendations ─────────────────────────────────────────────────────────

/**
 * Upsert recommendations for a score.
 */
async function upsertRecommendation({ scoreId, explanationText, items, aiGenerated }) {
  const { data, error } = await supabaseAdmin
    .from('recommendations')
    .upsert(
      {
        score_id: scoreId,
        explanation_text: explanationText,
        items: items,
        ai_generated: aiGenerated,
        created_at: new Date().toISOString(),
      },
      { onConflict: 'score_id' }
    )
    .select()
    .single();

  if (error) throw new Error(`DB upsertRecommendation failed: ${error.message}`);
  return data;
}

/**
 * Get existing recommendation for a score.
 */
async function getRecommendation(scoreId) {
  const { data, error } = await supabaseAdmin
    .from('recommendations')
    .select('*')
    .eq('score_id', scoreId)
    .single();

  if (error && error.code !== 'PGRST116') throw new Error(`DB getRecommendation failed: ${error.message}`);
  return data || null;
}

// ─── Upload + Score joined query (for status polling) ────────────────────────

/**
 * Get upload status with associated score + recommendation (if exists).
 * Used by the polling endpoint GET /statements/:uploadId/status
 */
async function getUploadWithScore(uploadId, userId) {
  const { data: upload, error: uploadError } = await supabaseAdmin
    .from('uploads')
    .select('upload_id, file_name, status, uploaded_at, statement_start_date, statement_end_date')
    .eq('upload_id', uploadId)
    .eq('user_id', userId)
    .is('deleted_at', null)
    .single();

  if (uploadError && uploadError.code !== 'PGRST116') {
    throw new Error(`DB getUploadWithScore (upload) failed: ${uploadError.message}`);
  }
  if (!upload) return null;

  // Fetch score if upload is completed
  let score = null;
  let recommendation = null;
  if (upload.status === 'completed' || upload.status === 'low_confidence') {
    const { data: scoreData } = await supabaseAdmin
      .from('scores')
      .select('*')
      .eq('upload_id', uploadId)
      .single();

    if (scoreData) {
      score = scoreData;
      const { data: recData } = await supabaseAdmin
        .from('recommendations')
        .select('*')
        .eq('score_id', scoreData.score_id)
        .single();
      recommendation = recData || null;
    }
  }

  return { upload, score, recommendation };
}

module.exports = {
  createUpload,
  updateUploadStatus,
  getUpload,
  softDeleteUpload,
  listUploads,
  upsertScore,
  getLatestScore,
  getScoreHistory,
  getScoreById,
  upsertRecommendation,
  getRecommendation,
  getUploadWithScore,
};
