'use strict';

/**
 * ScoreZero Backend API — Express Application
 * ─────────────────────────────────────────────
 * Port: 4000 (configurable via PORT env var)
 *
 * Routes:
 *   GET  /health
 *   POST /auth/signup
 *   POST /auth/login
 *   POST /auth/refresh
 *   POST /auth/logout
 *   GET  /auth/me
 *   POST /statements/upload
 *   GET  /statements/:uploadId/status
 *   GET  /statements
 *   DELETE /statements/:uploadId
 *   GET  /scores/latest
 *   GET  /scores/history
 *   GET  /scores/:scoreId
 *   POST /scores/:uploadId/report
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const config = require('./config');

// Route handlers
const authRoutes = require('./routes/auth');
const statementRoutes = require('./routes/statements');
const scoreRoutes = require('./routes/scores');

// Error handler
const { errorHandler } = require('./middleware/errorHandler');

const app = express();

// ── Security headers ──────────────────────────────────────────────────────────
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// ── CORS ──────────────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, Postman)
      if (!origin) return callback(null, true);
      if (
        config.corsOrigins.includes('*') ||
        config.corsOrigins.includes(origin) ||
        config.nodeEnv === 'development' ||
        origin.endsWith('.vercel.app')
      ) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'scorezero-backend',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    endpoints: {
      auth: '/auth',
      statements: '/statements',
      scores: '/scores',
    },
  });
});

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/auth', authRoutes);
app.use('/statements', statementRoutes);
app.use('/scores', scoreRoutes);

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found.', code: 'NOT_FOUND' });
});

// ── Global error handler (must be last) ──────────────────────────────────────
app.use(errorHandler);

// ── Start server ──────────────────────────────────────────────────────────────
const PORT = config.port;
app.listen(PORT, () => {
  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log(`║  🚀 ScoreZero Backend listening on port ${PORT}     ║`);
  console.log(`║  📍 Environment: ${config.nodeEnv.padEnd(32)}║`);
  console.log(`║  🔗 Health: http://localhost:${PORT}/health          ║`);
  console.log('╚══════════════════════════════════════════════════╝\n');

  if (!config.supabaseServiceRoleKey) {
    console.warn('  ⚠️  SUPABASE_SERVICE_ROLE_KEY not set — DB writes will fail');
  }
  if (!config.groqApiKey) {
    console.warn('  ⚠️  GROQ_API_KEY not set — AI recommendations will use fallback');
  }
  if (!config.googleCredentials) {
    console.warn('  ℹ️  GOOGLE_APPLICATION_CREDENTIALS not set — OCR fallback disabled');
  }
  console.log('');
});

module.exports = app;
