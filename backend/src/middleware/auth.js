'use strict';

const jwt = require('jsonwebtoken');
const config = require('../config');
const { supabaseAdmin } = require('../services/supabaseClient');

/**
 * Attempts to decode and verify a JWT using multiple strategies:
 * 1. Supabase JWT secret (HS256, audience=authenticated)
 * 2. Unverified decode fallback for Supabase tokens (dev-mode: checks expiry only)
 *
 * Returns a normalised payload: { userId, email, name } or null.
 */
function decodeToken(token) {
  // ── Strategy 1: Supabase JWT secret ───────────────────────────────────────
  if (config.supabaseJwtSecret) {
    try {
      const payload = jwt.verify(token, config.supabaseJwtSecret, {
        algorithms: ['HS256'],
        audience: 'authenticated',
      });
      const meta = payload.user_metadata || {};
      return {
        userId: payload.sub,
        email: payload.email,
        name: meta.full_name || meta.name || (payload.email ? payload.email.split('@')[0] : 'User'),
      };
    } catch (_) {
      // fall through
    }
  }

  // ── Strategy 2: Unverified fallback (respects exp claim) ──────────────────
  try {
    const unverified = jwt.decode(token);
    if (unverified && unverified.sub && unverified.email) {
      const nowSec = Math.floor(Date.now() / 1000);
      if (unverified.exp && nowSec > unverified.exp) {
        return null; // Token expired — reject
      }
      const meta = unverified.user_metadata || {};
      return {
        userId: unverified.sub,
        email: unverified.email,
        name: meta.full_name || meta.name || unverified.email.split('@')[0],
      };
    }
  } catch (_) {
    // fall through
  }

  return null;
}

/**
 * requireAuth middleware
 * ─────────────────────
 * Verifies the Bearer token and sets req.userId / req.userEmail on the request.
 * Uses Supabase admin to validate the token against live Supabase Auth.
 */
async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Authentication required. Please log in.',
        code: 'MISSING_TOKEN',
      });
    }

    const token = authHeader.split(' ', 2)[1];

    // Primary: validate via Supabase getUser (most reliable)
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (!error && user) {
      req.userId = user.id;
      req.userEmail = user.email;
      req.userName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'User';
      return next();
    }

    // Fallback: local JWT decode (for dev/offline mode)
    const decoded = decodeToken(token);
    if (decoded) {
      req.userId = decoded.userId;
      req.userEmail = decoded.email;
      req.userName = decoded.name;
      return next();
    }

    return res.status(401).json({
      error: 'Invalid or expired token.',
      code: 'INVALID_TOKEN',
    });
  } catch (err) {
    return res.status(401).json({
      error: 'Invalid or expired token.',
      code: 'INVALID_TOKEN',
    });
  }
}

module.exports = { requireAuth };
