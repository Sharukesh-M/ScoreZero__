'use strict';

/**
 * routes/statements.js
 * ─────────────────────
 * Statement upload and status polling.
 *
 * POST /statements/upload
 *   - Accepts multipart/form-data with 'pdf' file field
 *   - Validates: PDF only, max 15 MB
 *   - Creates upload tracking record in Supabase
 *   - Starts background processing (setImmediate) — PDF never stored
 *   - Returns { upload_id, status: "processing", message }
 *
 * GET /statements/:uploadId/status
 *   - Polls upload status
 *   - Returns score + recommendations when completed
 *
 * DELETE /statements/:uploadId
 *   - Soft-deletes the upload record
 *
 * GET /statements
 *   - Lists user's uploads
 */

const { Router } = require('express');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const { requireAuth } = require('../middleware/auth');
const db = require('../db/supabaseDb');
const { processUpload } = require('../services/processingQueue');
const config = require('../config');

const router = Router();

// ── Multer: memory storage (no disk writes) ──────────────────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.maxUploadSizeBytes },
  fileFilter: (_req, file, cb) => {
    const isPDF =
      file.mimetype === 'application/pdf' ||
      file.originalname.toLowerCase().endsWith('.pdf');

    if (!isPDF) {
      const err = new Error('Invalid file format. Please upload a PDF.');
      err.status = 400;
      err.code = 'INVALID_FILE_TYPE';
      return cb(err);
    }
    cb(null, true);
  },
});

// ─── POST /statements/upload ─────────────────────────────────────────────────
router.post(
  '/upload',
  requireAuth,
  (req, res, next) => {
    upload.single('pdf')(req, res, (err) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(413).json({
            error: `File exceeds ${config.maxUploadSizeMb} MB limit.`,
            code: 'FILE_TOO_LARGE',
          });
        }
        if (err.status === 400) {
          return res.status(400).json({ error: err.message, code: err.code || 'INVALID_FILE_TYPE' });
        }
        return next(err);
      }
      next();
    });
  },
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          error: 'No PDF file provided. Please attach a PDF under the field name "pdf".',
          code: 'NO_FILE',
        });
      }

      const uploadId = uuidv4();
      const fileName = req.file.originalname || 'statement.pdf';
      const fileSizeBytes = req.file.size;
      const pdfBuffer = req.file.buffer; // In-memory — never written to disk
      const password = req.body.optional_password || req.body.password || null;

      // Create tracking record in Supabase (no file bytes stored)
      await db.createUpload({
        uploadId,
        userId: req.userId,
        fileName,
        fileSizeBytes,
      });

      // Kick off async processing — response returns immediately
      setImmediate(() => {
        processUpload(uploadId, req.userId, pdfBuffer, password).catch((err) => {
          console.error('[statements/upload] Unhandled error in processUpload:', err.message);
        });
      });

      return res.status(202).json({
        upload_id: uploadId,
        status: 'processing',
        message: 'Processing your statement. Poll /statements/' + uploadId + '/status for results.',
      });
    } catch (err) {
      next(err);
    }
  }
);

// ─── GET /statements/:uploadId/status ────────────────────────────────────────
router.get('/:uploadId/status', requireAuth, async (req, res, next) => {
  try {
    const { uploadId } = req.params;
    const result = await db.getUploadWithScore(uploadId, req.userId);

    if (!result) {
      return res.status(404).json({
        error: 'Upload not found or you do not have access to this resource.',
        code: 'FORBIDDEN',
      });
    }

    const { upload, score, recommendation } = result;

    // Base response
    const response = {
      upload_id: upload.upload_id,
      status: upload.status,
    };

    // Attach score + recommendations when done
    if (score && (upload.status === 'completed' || upload.status === 'low_confidence')) {
      response.score = {
        score_id: score.score_id,
        score_value: score.score_value,
        score_band: score.score_band,
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
        calculated_at: score.calculated_at,
      };

      if (upload.status === 'low_confidence') {
        response.warning =
          'Low confidence extraction — fewer than 3 transactions were found. Results may be inaccurate.';
      }
    }

    if (upload.status === 'failed') {
      response.error = 'PDF processing failed. Please try uploading again or use a different statement.';
    }

    return res.status(200).json(response);
  } catch (err) {
    next(err);
  }
});

// ─── GET /statements (list uploads) ──────────────────────────────────────────
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const uploads = await db.listUploads(req.userId);
    return res.status(200).json({ uploads });
  } catch (err) {
    next(err);
  }
});

// ─── DELETE /statements/:uploadId ────────────────────────────────────────────
router.delete('/:uploadId', requireAuth, async (req, res, next) => {
  try {
    const { uploadId } = req.params;
    await db.softDeleteUpload(uploadId, req.userId);
    return res.status(200).json({ message: 'History item deleted.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
