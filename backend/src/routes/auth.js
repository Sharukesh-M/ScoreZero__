'use strict';

/**
 * routes/auth.js
 * ──────────────
 * Authentication via Supabase Auth.
 *
 * POST /auth/signup
 * POST /auth/login
 * POST /auth/refresh
 * POST /auth/logout
 * GET  /auth/me
 */

const { Router } = require('express');
const { supabaseAnon, supabaseAdmin } = require('../services/supabaseClient');
const { requireAuth } = require('../middleware/auth');
const { validate, signupSchema, loginSchema, refreshSchema } = require('../middleware/validate');

const router = Router();

// ─── POST /auth/signup ────────────────────────────────────────────────────────
router.post('/signup', validate(signupSchema), async (req, res, next) => {
  const { email, password, name } = req.body;
  try {
    const { data, error } = await supabaseAnon.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name || email.split('@')[0], name: name || email.split('@')[0] },
      },
    });

    if (error) {
      if (error.message.toLowerCase().includes('already registered')) {
        return res.status(409).json({ error: 'An account with this email already exists.', code: 'EMAIL_TAKEN' });
      }
      return res.status(400).json({ error: error.message, code: 'SIGNUP_ERROR' });
    }

    const user = data.user;
    return res.status(201).json({
      user_id: user.id,
      email: user.email,
      auth_token: data.session?.access_token || null,
      refresh_token: data.session?.refresh_token || null,
      message: 'Account created! Please check your email to verify your account.',
    });
  } catch (err) {
    next(err);
  }
});

// ─── POST /auth/login ─────────────────────────────────────────────────────────
router.post('/login', validate(loginSchema), async (req, res, next) => {
  const { email, password } = req.body;
  try {
    const { data, error } = await supabaseAnon.auth.signInWithPassword({ email, password });

    if (error) {
      return res.status(401).json({ error: 'Invalid email or password.', code: 'INVALID_CREDENTIALS' });
    }

    const user = data.user;
    return res.status(200).json({
      user_id: user.id,
      email: user.email,
      auth_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    });
  } catch (err) {
    next(err);
  }
});

// ─── POST /auth/refresh ───────────────────────────────────────────────────────
router.post('/refresh', validate(refreshSchema), async (req, res, next) => {
  const { refresh_token } = req.body;
  try {
    const { data, error } = await supabaseAnon.auth.refreshSession({ refresh_token });

    if (error) {
      return res.status(401).json({ error: 'Invalid or expired refresh token.', code: 'INVALID_REFRESH_TOKEN' });
    }

    return res.status(200).json({
      auth_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    });
  } catch (err) {
    next(err);
  }
});

// ─── POST /auth/logout ────────────────────────────────────────────────────────
router.post('/logout', requireAuth, async (req, res, next) => {
  try {
    // Invalidate the session on Supabase's side
    await supabaseAdmin.auth.admin.signOut(req.userId).catch(() => {});
    return res.status(200).json({ message: 'Logged out' });
  } catch (err) {
    next(err);
  }
});

// ─── GET /auth/me ─────────────────────────────────────────────────────────────
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const { data: { user }, error } = await supabaseAdmin.auth.admin.getUserById(req.userId);

    if (error || !user) {
      return res.status(404).json({ error: 'User not found.', code: 'USER_NOT_FOUND' });
    }

    return res.status(200).json({
      user: {
        user_id: user.id,
        email: user.email,
        name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0],
        email_verified: user.email_confirmed_at != null,
        created_at: user.created_at,
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
