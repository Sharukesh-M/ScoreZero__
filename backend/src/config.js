'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const MAX_MB = parseInt(process.env.MAX_UPLOAD_SIZE_MB || '15', 10);

module.exports = {
  // Server
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigins: (process.env.CORS_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),

  // Supabase
  supabaseUrl: process.env.SUPABASE_URL || '',
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY || '',
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  supabaseJwtSecret: process.env.SUPABASE_JWT_SECRET || '',

  // Groq
  groqApiKey: process.env.GROQ_API_KEY || '',
  groqModel: process.env.GROQ_MODEL || 'mixtral-8x7b-32768',
  groqTimeoutMs: parseInt(process.env.GROQ_TIMEOUT_MS || '4000', 10),

  // Google Cloud Vision
  googleProjectId: process.env.GOOGLE_CLOUD_PROJECT_ID || '',
  googleCredentials: process.env.GOOGLE_APPLICATION_CREDENTIALS || '',

  // Upload limits
  maxUploadSizeMb: MAX_MB,
  maxUploadSizeBytes: MAX_MB * 1024 * 1024,
};
