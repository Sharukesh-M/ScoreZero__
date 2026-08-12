import axios from 'axios';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_NODE_API_URL ||
  'https://scorezero-backend.onrender.com';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 45000,
});

// Attach JWT token from localStorage if present
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('scorezero_token') || localStorage.getItem('supabase_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Unified error response handler
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.data?.error) {
      return Promise.reject(new Error(error.response.data.error));
    }
    if (error.response?.data?.message) {
      return Promise.reject(new Error(error.response.data.message));
    }
    if (error.request) {
      return Promise.reject(
        new Error(
          'Unable to reach ScoreZero backend server. Please check your network connection or verify if backend is live.'
        )
      );
    }
    return Promise.reject(new Error(error.message || 'An unexpected network error occurred.'));
  }
);

/* TypeScript Interfaces matching Flask Backend */

export interface User {
  user_id: string;
  name: string;
  email: string;
  email_verified: boolean;
  avatar_url?: string;
  created_at?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
  message?: string;
}

export interface Transaction {
  date: string;
  description: string;
  amount: number;
  transaction_type: 'Credit' | 'Debit';
  category: 'income' | 'essential_spend' | 'discretionary_spend' | 'loan_repayment' | 'bounce_penalty';
  running_balance?: number | null;
}

export interface ParseResult {
  transactions: Transaction[];
  low_confidence: boolean;
  statement_start_date?: string | null;
  statement_end_date?: string | null;
  total_count: number;
  error?: string;
}

export interface UploadItem {
  upload_id: string;
  file_name: string;
  status: 'uploaded' | 'parsed' | 'low_confidence' | 'scored' | 'error';
  uploaded_at: string;
}

export interface ScoreMetrics {
  income_regularity: number;
  savings_ratio: number;
  spending_discipline: number;
  bounce_frequency: number;
  balance_trend: number;
  score_value: number;
  score_band: 'Poor' | 'Fair' | 'Good' | 'Very Good' | 'Excellent';
}

export interface ScoreRecord {
  score_id: string;
  upload_id?: string;
  score_value: number;
  score_band: 'Poor' | 'Fair' | 'Good' | 'Very Good' | 'Excellent';
  low_confidence?: boolean;
  calculated_at: string;
  metrics?: ScoreMetrics;
}

export interface RecommendationItem {
  id: string;
  text: string;
  ai_generated: boolean;
  explanation?: string;
}

/* API Export */
export const scoreZeroAPI = {
  // Health check
  checkHealth: async () => {
    const res = await api.get<{ status: string; service: string; endpoints?: Record<string, string> }>('/health');
    return res.data;
  },

  // Auth endpoints
  auth: {
    signup: async (data: { name: string; email: string; password: string }) => {
      const res = await api.post<AuthResponse>('/auth/signup', data);
      return res.data;
    },

    login: async (data: { email: string; password: string }) => {
      const res = await api.post<AuthResponse>('/auth/login', data);
      return res.data;
    },

    googleLogin: async (data: { credential?: string; email?: string; name?: string }) => {
      const res = await api.post<AuthResponse>('/auth/google', data);
      return res.data;
    },

    supabaseSync: async (data: { access_token?: string; email?: string; name?: string; user_id?: string }) => {
      const res = await api.post<AuthResponse>('/auth/supabase-sync', data);
      return res.data;
    },

    getMe: async () => {
      const res = await api.get<{ user: User }>('/auth/me');
      return res.data;
    },

    forgotPassword: async (email: string) => {
      const res = await api.post<{ message: string }>('/auth/forgot-password', { email });
      return res.data;
    },

    resetPassword: async (token: string, password: string) => {
      const res = await api.post<{ message: string }>('/auth/reset-password', { token, password });
      return res.data;
    },

    verifyEmail: async (token: string) => {
      const res = await api.post<{ message: string }>('/auth/verify-email', { token });
      return res.data;
    },
  },

  // Uploads endpoints
  uploads: {
    list: async () => {
      const res = await api.get<{ uploads: UploadItem[] }>('/uploads');
      return res.data;
    },

    uploadFile: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post<{ message: string; upload: UploadItem }>('/uploads', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data;
    },

    parse: async (uploadId: string, password?: string) => {
      const res = await api.post<ParseResult>(`/uploads/${uploadId}/parse`, { password });
      return res.data;
    },

    delete: async (uploadId: string) => {
      const res = await api.delete<{ message: string }>(`/uploads/${uploadId}`);
      return res.data;
    },
  },

  // Scores endpoints
  scores: {
    compute: async (uploadId: string, transactions: Transaction[], lowConfidence = false) => {
      const res = await api.post<{ message: string; score_id: string; metrics: ScoreMetrics }>('/scores', {
        upload_id: uploadId,
        transactions,
        low_confidence: lowConfidence,
      });
      return res.data;
    },

    getLatest: async () => {
      const res = await api.get<{ score: ScoreRecord | null }>('/scores/latest');
      return res.data;
    },

    list: async () => {
      const res = await api.get<{ scores: ScoreRecord[] }>('/scores');
      return res.data;
    },
  },

  // Recommendations
  recommendations: {
    get: async (scoreId: string) => {
      const res = await api.get<{ recommendations: RecommendationItem[] }>(`/recommendations/${scoreId}`);
      return res.data;
    },
  },

  // Reports
  reports: {
    downloadReportPdf: async (scoreId: string) => {
      const res = await api.get(`/reports/${scoreId}`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `ScoreZero_Report_${scoreId.slice(0, 8)}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    },
  },

  // Account management
  account: {
    deleteAccount: async () => {
      const res = await api.delete<{ message: string }>('/account/delete');
      return res.data;
    },
  },
};

export default scoreZeroAPI;
