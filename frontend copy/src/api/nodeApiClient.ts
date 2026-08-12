/**
 * nodeApiClient.ts
 * ─────────────────
 * API client for the ScoreZero Node.js/Express backend (port 4000).
 * Separate from the legacy Flask client to avoid conflicts.
 */

import axios from 'axios';
import { supabase } from '../lib/supabase';

const NODE_API_BASE =
  import.meta.env.VITE_NODE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  'https://scorezero-backend.onrender.com';

const nodeApi = axios.create({
  baseURL: NODE_API_BASE,
  timeout: 60_000,
});

// Attach the Supabase session JWT or localStorage token automatically
nodeApi.interceptors.request.use(async (config) => {
  let token: string | undefined;
  try {
    const { data } = await supabase.auth.getSession();
    token = data.session?.access_token;
  } catch {}
  if (!token) {
    token = localStorage.getItem('scorezero_token') || localStorage.getItem('supabase_token') || undefined;
  }
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Normalise error messages
nodeApi.interceptors.response.use(
  (res) => res,
  (err) => {
    const msg =
      err.response?.data?.error ||
      err.response?.data?.message ||
      err.message ||
      'Network error';
    return Promise.reject(new Error(msg));
  }
);

// ─── Types ────────────────────────────────────────────────────────────────────

export interface NodeUser {
  user_id: string;
  email: string;
  name: string;
  email_verified: boolean;
  created_at?: string;
}

export interface UploadResponse {
  upload_id: string;
  status: 'processing';
  message: string;
}

export interface ScoreMetrics {
  income_regularity: number;
  savings_ratio: number;
  spending_discipline: number;
  bounce_frequency: number;
  balance_trend: number;
}

export type ScoreBand = 'Poor' | 'Fair' | 'Good' | 'Very Good' | 'Excellent';

export interface ExtractedTransaction {
  date: string;
  description: string;
  amount: number;
  transaction_type: 'Credit' | 'Debit';
  category: string;
}

export interface LoanAssessment {
  lender_eligibility: 'yes' | 'no' | 'conditional';
  loan_amount_recommended: number;
  interest_rate_range: string;
  risk_assessment: 'low' | 'medium-low' | 'medium' | 'medium-high' | 'high';
  rejection_reason?: string | null;
}

export interface ScoreResult {
  score_id: string;
  upload_id: string;
  score_value: number;
  score_band: ScoreBand;
  metrics: ScoreMetrics;
  explanation: string | null;
  recommendations: string[];
  insights?: string[];
  priority?: string;
  timeframe?: string;
  user_question?: string;
  custom_question_answer?: string;
  ai_generated: boolean;
  calculated_at: string;
  extracted_transactions?: ExtractedTransaction[];
  raw_text_sample?: string;
  loan_assessment?: LoanAssessment;
}

export interface UploadStatusResponse {
  upload_id: string;
  status: 'processing' | 'completed' | 'failed' | 'low_confidence' | 'extraction_failed' | 'extraction_integrity_failed' | 'incomplete_statement_type' | 'insufficient_data';
  score?: ScoreResult;
  warning?: string;
  error?: string;
  gate_stopped?: string;
  detected_issue?: string;
  reasons?: string[];
  extracted_transactions?: ExtractedTransaction[];
  raw_text_sample?: string;
}

export interface HistoryScore {
  score_id: string;
  upload_id: string;
  score_value: number;
  score_band: ScoreBand;
  calculated_at: string;
}

// ─── API methods ──────────────────────────────────────────────────────────────

export const nodeApiClient = {
  health: async () => {
    const res = await nodeApi.get<{ status: string; service: string }>('/health');
    return res.data;
  },

  auth: {
    me: async () => {
      const res = await nodeApi.get<{ user: NodeUser }>('/auth/me');
      return res.data.user;
    },
    logout: async () => {
      await nodeApi.post('/auth/logout');
    },
  },

  statements: {
    upload: async (file: File, password?: string, userQuestion?: string): Promise<UploadResponse> => {
      const form = new FormData();
      form.append('pdf', file);
      if (password) form.append('optional_password', password);
      if (userQuestion) form.append('user_question', userQuestion);
      const res = await nodeApi.post<UploadResponse>('/statements/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data;
    },

    pollStatus: async (uploadId: string): Promise<UploadStatusResponse> => {
      const res = await nodeApi.get<UploadStatusResponse>(`/statements/${uploadId}/status`);
      return res.data;
    },

    list: async () => {
      const res = await nodeApi.get<{ uploads: { upload_id: string; file_name: string; status: string; uploaded_at: string }[] }>('/statements');
      return res.data.uploads;
    },

    delete: async (uploadId: string) => {
      await nodeApi.delete(`/statements/${uploadId}`);
    },

    chat: async (uploadId: string, question: string, context?: any): Promise<{ answer: string; question: string; upload_id: string }> => {
      const res = await nodeApi.post<{ answer: string; question: string; upload_id: string }>(`/statements/${uploadId}/chat`, { question, context });
      return res.data;
    },
  },

  scores: {
    latest: async (): Promise<ScoreResult | null> => {
      const res = await nodeApi.get<{ score: ScoreResult | null }>('/scores/latest');
      return res.data.score;
    },

    history: async (limit = 10, offset = 0): Promise<{ scores: HistoryScore[]; total_count: number }> => {
      const res = await nodeApi.get<{ scores: HistoryScore[]; total_count: number }>(
        `/scores/history?limit=${limit}&offset=${offset}`
      );
      return res.data;
    },

    report: async (uploadId: string) => {
      const res = await nodeApi.post(`/scores/${uploadId}/report`);
      return res.data.report;
    },
  },

  chat: async (message: string, context?: any): Promise<{ reply: string; answer: string }> => {
    const res = await nodeApi.post<{ reply?: string; answer?: string }>('/api/chat', { message, question: message, context });
    const text = res.data.reply || res.data.answer || 'No response generated.';
    return { reply: text, answer: text };
  },
};

export default nodeApiClient;
