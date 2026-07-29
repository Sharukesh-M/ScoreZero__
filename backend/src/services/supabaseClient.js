'use strict';

const { createClient } = require('@supabase/supabase-js');
const config = require('../config');

if (!config.supabaseUrl || config.supabaseUrl === 'https://placeholder.supabase.co') {
  console.warn('[Supabase] WARNING: SUPABASE_URL is not set. Database operations will fail.');
}

/**
 * Admin client (service role) — bypasses RLS, used for server-side operations.
 * Never expose this to the frontend.
 */
const supabaseAdmin = createClient(config.supabaseUrl, config.supabaseServiceRoleKey || config.supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

/**
 * Anon client — for Auth operations that take a user's JWT.
 */
const supabaseAnon = createClient(config.supabaseUrl, config.supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

module.exports = { supabaseAdmin, supabaseAnon };
