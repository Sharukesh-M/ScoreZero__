/**
 * ScoreZeroDashboard.tsx
 * ─────────────────────────
 * Full Neumorphism dashboard for ScoreZero.
 * Connects to the Node.js/Express backend on port 4000.
 *
 * Sections:
 *  1. Header (user, logout, backend status)
 *  2. Upload Zone (drag-drop, async polling)
 *  3. Hero Score Card (large embossed)
 *  4. Metrics Grid (5 circular gauges)
 *  5. AI Explanation + Recommendations
 *  6. Score History Timeline
 *  7. Footer actions (report download, delete)
 */

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  memo,
} from 'react';
import {
  Upload,
  FileText,
  AlertCircle,
  Download,
  Trash2,
  TrendingUp,
  TrendingDown,
  Minus,
  Shield,
  Sparkles,
  Check,
  X,
  Clock,
  BarChart2,
  DollarSign,
  Activity,
  Zap,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { GlowBackdrop } from './GlowBackdrop';
import { TopNavBar, type NavTab } from './TopNavBar';
import { LoanReadinessPage } from './LoanReadinessPage';
import { GeminiStatementChat } from './GeminiStatementChat';
import nodeApiClient, {
  type ScoreResult,
  type ScoreMetrics,
  type HistoryScore,
  type UploadStatusResponse,
} from '../../api/nodeApiClient';

// ─── Neumorphism Styles (inline for isolation) ─────────────────────────────────
const nm = {
  bg: '#F0F4F8',
  raised: '−8px −8px 20px rgba(255,255,255,0.85), 8px 8px 20px rgba(163,177,198,0.45)',
  pressed: 'inset −4px −4px 10px rgba(255,255,255,0.8), inset 4px 4px 10px rgba(163,177,198,0.4)',
  hover: '−10px −10px 28px rgba(255,255,255,0.9), 10px 10px 28px rgba(163,177,198,0.55)',
  card: {
    background: '#F0F4F8',
    borderRadius: '24px',
    boxShadow: '-8px -8px 20px rgba(255,255,255,0.85), 8px 8px 20px rgba(163,177,198,0.45)',
  },
  hero: {
    background: '#F0F4F8',
    borderRadius: '32px',
    boxShadow: '-12px -12px 30px rgba(255,255,255,0.9), 12px 12px 30px rgba(163,177,198,0.5)',
  },
  pressed_style: {
    boxShadow: 'inset -4px -4px 10px rgba(255,255,255,0.8), inset 4px 4px 10px rgba(163,177,198,0.4)',
  },
  input: {
    background: '#E8EDF3',
    borderRadius: '14px',
    boxShadow: 'inset -3px -3px 8px rgba(255,255,255,0.8), inset 3px 3px 8px rgba(163,177,198,0.35)',
    border: 'none',
    outline: 'none',
  },
};

// ─── Utility ─────────────────────────────────────────────────────────────────

function getBandColor(band: string): string {
  switch (band) {
    case 'Excellent': return '#22c55e';
    case 'Very Good': return '#4A90E2';
    case 'Good':      return '#f59e0b';
    case 'Fair':      return '#f97316';
    case 'Poor':      return '#ef4444';
    default:          return '#4A90E2';
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

// ─── Toast notification ───────────────────────────────────────────────────────

interface ToastProps { message: string; type: 'success' | 'error' | 'info'; onClose: () => void; }
const Toast = ({ message, type, onClose }: ToastProps) => {
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }, [onClose]);
  const colors = { success: '#22c55e', error: '#ef4444', info: '#4A90E2' };
  return (
    <div style={{
      position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999,
      background: 'var(--bg-secondary, #F0F4F8)', borderRadius: '16px', padding: '14px 20px',
      boxShadow: 'var(--shadow-card)',
      border: '1px solid rgba(255,255,255,0.1)',
      display: 'flex', alignItems: 'center', gap: '12px',
      animation: 'slideUp 0.3s cubic-bezier(0.34,1.56,0.64,1)',
      maxWidth: '360px',
    }}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: colors[type], flexShrink: 0 }} />
      <span style={{ fontSize: 14, color: 'var(--text-primary, #2C3E50)', fontWeight: 500 }}>{message}</span>
      <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary, #7A8FA3)', marginLeft: 'auto' }}>
        <X size={14} />
      </button>
    </div>
  );
};

// ─── Circular Metric Gauge ────────────────────────────────────────────────────

interface GaugeProps { value: number; size?: number; color?: string; strokeWidth?: number; }
const CircularGauge = memo(({ value, size = 90, color = '#4A90E2', strokeWidth = 8 }: GaugeProps) => {
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (value / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={strokeWidth} />
      <circle
        cx={size/2} cy={size/2} r={r} fill="none"
        stroke={color} strokeWidth={strokeWidth}
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 1s cubic-bezier(0.34,1.56,0.64,1)' }}
      />
    </svg>
  );
});

// ─── Metric Card ──────────────────────────────────────────────────────────────

interface MetricCardProps {
  label: string;
  value: number | null;
  Icon: React.FC<{ size?: number; color?: string }>;
  color: string;
  description: string;
}
const MetricCard = memo(({ label, value, Icon, color, description }: MetricCardProps) => {
  const [hovered, setHovered] = useState(false);
  const isAvailable = value !== null && value !== undefined;
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: 'var(--bg-secondary, #F0F4F8)',
        borderRadius: '24px',
        padding: '24px',
        boxShadow: hovered
          ? 'var(--shadow-card, -8px -8px 24px rgba(255,255,255,0.85), 8px 8px 24px rgba(163,177,198,0.45))'
          : 'var(--shadow-raised, -4px -4px 10px rgba(255,255,255,0.85), 4px 4px 10px rgba(163,177,198,0.4))',
        transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
        transition: 'all 0.3s cubic-bezier(0.34,1.56,0.64,1)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px',
        cursor: 'default', textAlign: 'center',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <div style={{ position: 'relative', width: 90, height: 90, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularGauge value={isAvailable ? value : 0} color={isAvailable ? color : '#94A3B8'} />
        <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Icon size={16} color={isAvailable ? color : '#94A3B8'} />
          <span style={{ fontSize: isAvailable ? 18 : 14, fontWeight: 700, color: isAvailable ? 'var(--text-primary, #2C3E50)' : '#94A3B8', lineHeight: 1.1 }}>
            {isAvailable ? value : 'N/A'}
          </span>
        </div>
      </div>
      <div>
        <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary, #2C3E50)', marginBottom: 4 }}>{label}</p>
        <p style={{ fontSize: 11, color: isAvailable ? 'var(--text-secondary, #7A8FA3)' : '#94A3B8', lineHeight: 1.4 }}>
          {isAvailable ? description : 'Not available from this statement type'}
        </p>
      </div>
    </div>
  );
});

// ─── Dashboard Specific Question Card (Visible ONLY if user specifies a question) ──

const DashboardQuestionCard = ({ score }: { score: ScoreResult }) => {
  const [question, setQuestion] = useState(score.user_question || '');
  
  const getDerivedAnswer = () => {
    if (score.custom_question_answer) return score.custom_question_answer;
    if (score.user_question) {
      const qLower = score.user_question.toLowerCase();
      if (qLower.includes('loan') || qLower.includes('when') || qLower.includes('eligible')) {
        if (score.score_value >= 70) {
          return `Based on your high ScoreZero score of ${score.score_value}/100 (${score.score_band}), you are currently eligible for pre-approved loan offers! Keep your monthly deposit history clean.`;
        } else if (score.score_value >= 50) {
          return `With a moderate score of ${score.score_value}/100, maintain 30–60 days of steady deposits and zero bounce fees to qualify for pre-approved loan offers.`;
        } else {
          return `With your current score of ${score.score_value}/100 (${score.score_band}), loan approval requires building a 3-month clean transaction history with zero bounce fees, reducing discretionary expenses, and maintaining positive savings.`;
        }
      }
      return `Regarding your question "${score.user_question}": Focus on building a consistent 3-month deposit history and maintaining a positive savings ratio to improve your rating.`;
    }
    return null;
  };

  const [answer, setAnswer] = useState<string | null>(getDerivedAnswer());
  const [loading, setLoading] = useState(false);

  const handleAsk = async () => {
    if (!question.trim() || loading || !score.upload_id) return;
    setLoading(true);
    try {
      const res = await nodeApiClient.statements.chat(score.upload_id, question);
      setAnswer(res.answer || 'No answer generated for this question.');
    } catch {
      setAnswer('Unable to generate answer. Please try asking again.');
    } finally {
      setLoading(false);
    }
  };

  // Visible ONLY if user specified a question!
  if (!score.user_question && !score.custom_question_answer && !answer) {
    return null;
  }

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(66, 133, 244, 0.18), rgba(161, 66, 244, 0.18))',
      borderRadius: '24px',
      padding: '24px 28px',
      border: '1px solid rgba(66, 133, 244, 0.35)',
      boxShadow: '0 8px 24px rgba(66, 133, 244, 0.2)',
      display: 'flex', flexDirection: 'column', gap: 12,
      animation: 'fadeIn 0.4s ease',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 34, height: 34, borderRadius: '50%',
          background: 'linear-gradient(135deg, #4285F4, #A142F4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 2px 8px rgba(66, 133, 244, 0.4)',
        }}>
          <Sparkles size={18} color="#FFFFFF" />
        </div>
        <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary, #FFFFFF)' }}>
          AI Answer to Your Statement Question
        </span>
      </div>

      {(score.user_question || question) && (
        <p style={{ fontSize: 13, fontStyle: 'italic', color: 'var(--text-secondary, #94A3B8)', margin: 0, paddingLeft: 4 }}>
          Q: "{score.user_question || question}"
        </p>
      )}

      {answer ? (
        <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--text-primary, #F1F5F9)', margin: 0, fontWeight: 500, paddingLeft: 4 }}>
          {answer}
        </p>
      ) : (
        <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
            placeholder="Ask specific question..."
            style={{
              flex: 1, padding: '10px 14px', borderRadius: '12px',
              border: '1px solid rgba(255,255,255,0.15)',
              background: '#0D0D11', color: '#FFFFFF', fontSize: '13px', outline: 'none',
            }}
          />
          <NmButton size="sm" variant="primary" onClick={handleAsk} disabled={loading || !question.trim()}>
            {loading ? 'Thinking…' : 'Ask'}
          </NmButton>
        </div>
      )}
    </div>
  );
};

// ─── Hero Score Card ──────────────────────────────────────────────────────────

interface ScoreCardProps { score: ScoreResult; onReset: () => void; }
const ScoreCard = ({ score, onReset }: ScoreCardProps) => {
  const bandColor = getBandColor(score.score_band);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  return (
    <div style={{
      background: 'var(--bg-secondary, #F0F4F8)',
      borderRadius: '32px',
      boxShadow: 'var(--shadow-card, -12px -12px 30px rgba(255,255,255,0.9), 12px 12px 30px rgba(163,177,198,0.5))',
      border: '1px solid rgba(255,255,255,0.08)',
      padding: '40px 48px',
      position: 'relative',
      overflow: 'hidden',
      animation: 'scaleIn 0.5s cubic-bezier(0.34,1.56,0.64,1)',
    }}>
      {/* Subtle glow blob */}
      <div style={{
        position: 'absolute', top: '-40px', right: '-40px',
        width: 200, height: 200, borderRadius: '50%',
        background: `radial-gradient(circle, ${bandColor}25 0%, transparent 70%)`,
        pointerEvents: 'none',
      }} />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 24 }}>
        {/* Left: score number */}
        <div>
          <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary, #7A8FA3)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 8 }}>
            ScoreZero Score
          </p>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{
              fontSize: 80, fontWeight: 800, lineHeight: 1,
              background: `linear-gradient(135deg, ${bandColor} 0%, ${bandColor}99 100%)`,
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>
              {mounted ? score.score_value : 0}
            </span>
            <span style={{ fontSize: 24, color: 'var(--text-secondary, #7A8FA3)', fontWeight: 500 }}>/100</span>
          </div>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 12,
            padding: '6px 14px', borderRadius: 999,
            background: `${bandColor}18`,
            border: `1.5px solid ${bandColor}40`,
          }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: bandColor }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: bandColor, letterSpacing: '0.5px' }}>
              {score.score_band}
            </span>
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-secondary, #7A8FA3)', marginTop: 10 }}>
            Calculated {formatDate(score.calculated_at)}
          </p>
        </div>

        {/* Right: mini metric summary */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 200 }}>
          {([
            ['Income Regularity', score.metrics.income_regularity],
            ['Savings Ratio', score.metrics.savings_ratio],
            ['Spending Discipline', score.metrics.spending_discipline],
            ['Bounce Frequency', score.metrics.bounce_frequency],
            ['Balance Trend', score.metrics.balance_trend],
          ] as [string, number | null][]).map(([label, val]) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 12, color: 'var(--text-secondary, #7A8FA3)', width: 140, flexShrink: 0 }}>{label}</span>
              <div style={{ flex: 1, height: 6, borderRadius: 99, background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 99,
                  width: `${val !== null ? val : 0}%`,
                  background: val !== null ? (val >= 70 ? '#22c55e' : val >= 45 ? '#f59e0b' : '#ef4444') : '#94A3B8',
                  transition: 'width 1s ease',
                }} />
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary, #2C3E50)', width: 28, textAlign: 'right' }}>
                {val !== null ? val : 'N/A'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Analyse another button */}
      <button
        onClick={onReset}
        style={{
          marginTop: 28, display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 20px', borderRadius: 12, border: 'none', cursor: 'pointer',
          background: 'var(--bg-primary, #F0F4F8)', color: 'var(--text-secondary, #7A8FA3)', fontSize: 13, fontWeight: 600,
          boxShadow: 'var(--shadow-raised)',
          transition: 'all 0.2s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent-primary, #4A90E2)')}
        onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary, #7A8FA3)')}
      >
        <Upload size={14} /> Analyse another statement
      </button>
    </div>
  );
};

// ─── Upload Zone ──────────────────────────────────────────────────────────────

type UploadState = 'idle' | 'uploading' | 'processing' | 'completed' | 'failed';

interface UploadZoneProps {
  onComplete: (score: ScoreResult) => void;
  onToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  uploadTrigger?: number;
}

const UploadZone = ({ onComplete, onToast, uploadTrigger }: UploadZoneProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [userQuestion, setUserQuestion] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [state, setState] = useState<UploadState>('idle');
  const [progress, setProgress] = useState(0);
  const [statusMsg, setStatusMsg] = useState('');
  const [warning, setWarning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPasswordInput, setShowPasswordInput] = useState(false);
  const [password, setPassword] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const uploadIdRef = useRef<string | null>(null);

  const prevUploadTriggerRef = useRef(uploadTrigger ?? 0);
  useEffect(() => {
    if (uploadTrigger && uploadTrigger > prevUploadTriggerRef.current) {
      prevUploadTriggerRef.current = uploadTrigger;
      fileRef.current?.click();
    }
  }, [uploadTrigger]);

  const validate = (f: File): string | null => {
    if (!f.name.toLowerCase().endsWith('.pdf')) return 'Only PDF files are accepted.';
    if (f.size > 15 * 1024 * 1024) return 'File must be under 15 MB.';
    return null;
  };

  const handleFile = (f: File) => {
    const err = validate(f);
    if (err) { setError(err); return; }
    setFile(f); setError(null);
  };

  const startUpload = useCallback(async (pwd?: string) => {
    if (!file) return;
    setError(null); setWarning(null);
    setState('uploading'); setProgress(20);
    setStatusMsg('Uploading statement…');

    try {
      const res = await nodeApiClient.statements.upload(file, pwd, userQuestion);
      uploadIdRef.current = res.upload_id;
      setState('processing'); setProgress(50);
      setStatusMsg('Extracting transactions & calculating score…');
      startPolling(res.upload_id);
    } catch (err: unknown) {
      setState('failed');
      let msg = err instanceof Error ? err.message : 'Upload failed';
      if (msg.includes('401') || msg.toLowerCase().includes('token') || msg.toLowerCase().includes('expired')) {
        msg = 'Your session has expired. Please sign in again with Google or Email.';
      }
      setError(msg);
      onToast(msg, 'error');
    }
  }, [file, userQuestion, onToast]);

  const startPolling = (uploadId: string) => {
    let dots = 0;
    pollRef.current = setInterval(async () => {
      dots = (dots + 1) % 4;
      setStatusMsg(`Analysing your statement${'.'.repeat(dots)}`);

      try {
        const status: UploadStatusResponse = await nodeApiClient.statements.pollStatus(uploadId);

        if (status.status === 'completed' || status.status === 'low_confidence') {
          if (pollRef.current) clearInterval(pollRef.current);
          setProgress(100);
          setState('completed');
          if (status.warning) setWarning(status.warning);
          if (status.score) {
            const finalScore: ScoreResult = { ...status.score };
            if (userQuestion && !finalScore.user_question) {
              finalScore.user_question = userQuestion;
            }
            if (userQuestion && !finalScore.custom_question_answer) {
              try {
                const chatRes = await nodeApiClient.statements.chat(uploadId, userQuestion);
                if (chatRes && chatRes.answer) {
                  finalScore.custom_question_answer = chatRes.answer;
                }
              } catch {
                // fall through
              }
            }
            onComplete(finalScore);
            onToast('Your ScoreZero score is ready!', 'success');
          }
        } else if (['failed', 'extraction_failed', 'extraction_integrity_failed', 'incomplete_statement_type', 'insufficient_data'].includes(status.status)) {
          if (pollRef.current) clearInterval(pollRef.current);
          setState('failed');
          let msg = status.error || 'Statement processing stopped by confidence gate.';
          if (status.status === 'extraction_failed') {
            msg = status.error || "We couldn't read any transactions from this file. Please upload a valid UPI/bank statement PDF (not a screenshot, scanned image, or password-protected file).";
          } else if (status.status === 'extraction_integrity_failed') {
            msg = status.error || "Extracted transaction totals do not match the declared totals on the statement header.";
          } else if (status.status === 'incomplete_statement_type') {
            msg = status.error || 'This document only shows money received, with no spending or balance data. Upload your full bank/UPI statement (showing both credits and debits) for an accurate score.';
          } else if (status.status === 'insufficient_data') {
            msg = status.error || 'We need a longer or more complete statement to generate a reliable score.';
          }
          setError(msg);
          onToast(msg, 'error');
        } else {
          setProgress((p) => Math.min(p + 5, 90));
        }
      } catch {
        // Transient network error — keep polling
      }
    }, 2000);
  };

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  };

  const isActive = state === 'uploading' || state === 'processing';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Drop zone */}
      <div
        onClick={() => !isActive && fileRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        style={{
          background: 'var(--bg-secondary, #F0F4F8)',
          borderRadius: '24px',
          padding: '40px 32px',
          textAlign: 'center',
          cursor: isActive ? 'default' : 'pointer',
          boxShadow: 'var(--shadow-card)',
          border: dragOver ? '2px dashed #4A90E2' : '1px solid rgba(255,255,255,0.08)',
          transition: 'all 0.3s ease',
          position: 'relative', overflow: 'hidden',
        }}
      >
        <input ref={fileRef} type="file" accept=".pdf,application/pdf" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />

        {isActive ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
            {/* Spinner */}
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              border: '4px solid rgba(255,255,255,0.1)',
              borderTop: '4px solid #4A90E2',
              animation: 'spin 1s linear infinite',
            }} />
            <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary, #2C3E50)' }}>{statusMsg}</p>
            {/* Progress bar */}
            <div style={{ width: '100%', maxWidth: 320, height: 8, borderRadius: 99, background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 99, background: 'linear-gradient(90deg, #4A90E2, #357ABD)',
                width: `${progress}%`, transition: 'width 0.6s ease',
              }} />
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-secondary, #7A8FA3)' }}>
              PDFs are processed in memory — never stored on disk.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            <div style={{
              width: 64, height: 64, borderRadius: '20px',
              background: 'var(--bg-primary, #F0F4F8)',
              boxShadow: 'var(--shadow-raised)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Upload size={26} color="#4A90E2" />
            </div>
            {file ? (
              <>
                <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary, #2C3E50)', display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
                  <FileText size={18} color="#4A90E2" />
                  {file.name}
                </p>
                <p style={{ fontSize: 13, color: 'var(--text-secondary, #7A8FA3)', margin: 0 }}>{(file.size / (1024 * 1024)).toFixed(2)} MB · Attached & ready</p>
              </>
            ) : (
              <>
                <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary, #2C3E50)', margin: 0 }}>
                  Upload Bank Statement PDF
                </p>
                <p style={{ fontSize: 13, color: 'var(--text-secondary, #7A8FA3)', margin: 0 }}>
                  Drag & drop your PhonePe, Google Pay, or HDFC/SBI PDF statement (max 15 MB)
                </p>
              </>
            )}
          </div>
        )}
      </div>

      {/* Gemini AI Searchbar Chat Pill Container */}
      {!isActive && (
        <div style={{
          position: 'relative',
          borderRadius: '999px',
          padding: '2px',
          background: 'linear-gradient(135deg, #4285F4, #A142F4, #EA4335, #FBBC05)',
          boxShadow: '0 6px 24px rgba(66, 133, 244, 0.35)',
          transition: 'all 0.3s ease',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '10px 20px',
            borderRadius: '999px',
            background: 'var(--bg-secondary, #0d0d11)',
            backdropFilter: 'blur(16px)',
          }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #4285F4, #A142F4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 3px 10px rgba(161, 66, 244, 0.45)',
            }}>
              <Sparkles size={18} color="#FFFFFF" />
            </div>

            <input
              type="text"
              value={userQuestion}
              onChange={(e) => setUserQuestion(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && file && startUpload()}
              placeholder="Ask any question about your statement (optional)..."
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                fontSize: '14px',
                fontWeight: 500,
                color: 'var(--text-primary, #FFFFFF)',
              }}
            />
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '14px 20px', borderRadius: 16,
          background: '#FEF2F2', border: '1.5px solid #FCA5A5',
          animation: 'slideUp 0.3s ease',
        }}>
          <AlertCircle size={18} color="#ef4444" style={{ flexShrink: 0 }} />
          <p style={{ fontSize: 13, color: '#b91c1c', flex: 1, margin: 0 }}>{error}</p>
          <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7A8FA3' }}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* Low-confidence warning */}
      {warning && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '14px 20px', borderRadius: 16,
          background: '#FFFBEB', border: '1.5px solid #FCD34D',
        }}>
          <AlertCircle size={18} color="#f59e0b" style={{ flexShrink: 0 }} />
          <p style={{ fontSize: 13, color: '#92400e', margin: 0 }}>{warning}</p>
        </div>
      )}

      {/* Password prompt */}
      {showPasswordInput && (
        <div style={{
          ...nm.card, padding: '24px',
          display: 'flex', flexDirection: 'column', gap: 14,
        }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: '#2C3E50', margin: 0 }}>
            🔒 This PDF is password-protected. Enter the password to continue.
          </p>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="PDF password"
            style={{ ...nm.input, padding: '12px 16px', fontSize: 14, color: '#2C3E50', width: '100%' }}
          />
          <div style={{ display: 'flex', gap: 12 }}>
            <NmButton onClick={() => { setShowPasswordInput(false); setFile(null); }} variant="ghost">Cancel</NmButton>
            <NmButton onClick={() => { setShowPasswordInput(false); startUpload(password); }} variant="primary">Decrypt & Analyse</NmButton>
          </div>
        </div>
      )}

      {/* Unified Action button */}
      {!isActive && (
        <NmButton
          onClick={() => {
            if (!file) {
              fileRef.current?.click();
            } else {
              startUpload();
            }
          }}
          variant="primary"
          fullWidth
          size="lg"
        >
          <Sparkles size={18} /> {file ? 'Upload & Analyze Statement' : 'Select PDF Statement & Analyze'}
        </NmButton>
      )}
    </div>
  );
};

// ─── Neumorphic Button ────────────────────────────────────────────────────────

interface NmButtonProps {
  onClick?: () => void;
  children: React.ReactNode;
  variant?: 'primary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  disabled?: boolean;
  type?: 'button' | 'submit';
}
const NmButton = ({ onClick, children, variant = 'ghost', size = 'md', fullWidth, disabled, type = 'button' }: NmButtonProps) => {
  const [pressed, setPressed] = useState(false);
  const [hovered, setHovered] = useState(false);

  const pads = { sm: '8px 16px', md: '11px 22px', lg: '14px 32px' };
  const fsize = { sm: 12, md: 14, lg: 16 };

  const baseStyle: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    gap: 8, border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
    borderRadius: '14px', fontWeight: 600, fontSize: fsize[size],
    padding: pads[size], transition: 'all 0.2s ease',
    width: fullWidth ? '100%' : undefined,
    opacity: disabled ? 0.5 : 1,
    userSelect: 'none',
  };

  const variants: Record<string, React.CSSProperties> = {
    primary: {
      background: 'linear-gradient(135deg, #4A90E2 0%, #357ABD 100%)',
      color: '#fff',
      boxShadow: pressed
        ? 'var(--shadow-inset)'
        : hovered
        ? '-4px -4px 12px rgba(255,255,255,0.3), 4px 4px 12px rgba(53,122,189,0.5)'
        : 'var(--shadow-raised)',
      transform: pressed ? 'scale(0.97)' : hovered ? 'translateY(-1px)' : 'none',
    },
    ghost: {
      background: 'var(--bg-secondary, #F0F4F8)',
      color: 'var(--text-secondary, #7A8FA3)',
      boxShadow: pressed ? 'var(--shadow-inset)' : 'var(--shadow-raised)',
      transform: pressed ? 'scale(0.97)' : 'none',
      border: '1px solid rgba(255,255,255,0.08)',
    },
    danger: {
      background: 'var(--bg-secondary, #F0F4F8)',
      color: '#ef4444',
      boxShadow: pressed ? 'var(--shadow-inset)' : 'var(--shadow-raised)',
      transform: pressed ? 'scale(0.97)' : 'none',
      border: '1px solid rgba(239, 68, 68, 0.2)',
    },
  };

  return (
    <button
      type={type}
      onClick={!disabled ? onClick : undefined}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setPressed(false); }}
      style={{ ...baseStyle, ...variants[variant] }}
    >
      {children}
    </button>
  );
};

// ─── Deterministic Loan Readiness Assessment ──────────────────────────

const LoanReadinessCard = ({ score }: { score: ScoreResult }) => {
  const loan = score.loan_assessment;
  if (!loan) return null;

  const eligColor = loan.lender_eligibility === 'yes' ? '#22c55e' : loan.lender_eligibility === 'conditional' ? '#f59e0b' : '#ef4444';
  const eligText = loan.lender_eligibility === 'yes' ? 'Eligible for Loan' : loan.lender_eligibility === 'conditional' ? 'Conditional Approval' : 'Not Eligible';

  return (
    <div style={{
      background: 'var(--bg-secondary, #F0F4F8)',
      borderRadius: '24px',
      boxShadow: 'var(--shadow-card)',
      padding: '28px 32px',
      borderLeft: `5px solid ${eligColor}`,
      borderTop: '1px solid rgba(255,255,255,0.08)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'var(--bg-primary, #F0F4F8)',
            boxShadow: 'var(--shadow-raised)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Shield size={16} color={eligColor} />
          </div>
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary, #2C3E50)', margin: 0 }}>Deterministic Loan Assessment</p>
            <p style={{ fontSize: 11, color: 'var(--text-secondary, #7A8FA3)', margin: 0 }}>Rule-based alternative lending engine</p>
          </div>
        </div>

        <span style={{
          padding: '6px 14px', borderRadius: 999, fontSize: 12, fontWeight: 700,
          background: `${eligColor}18`, color: eligColor, border: `1.5px solid ${eligColor}40`,
        }}>
          {eligText}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
        <div style={{ padding: '14px', borderRadius: 14, background: 'var(--bg-primary, #F0F4F8)', boxShadow: 'var(--shadow-inset)' }}>
          <p style={{ fontSize: 11, color: 'var(--text-secondary, #7A8FA3)', margin: '0 0 4px 0' }}>Recommended Loan Amount</p>
          <p style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary, #2C3E50)', margin: 0 }}>₹{loan.loan_amount_recommended.toLocaleString('en-IN')}</p>
        </div>

        <div style={{ padding: '14px', borderRadius: 14, background: 'var(--bg-primary, #F0F4F8)', boxShadow: 'var(--shadow-inset)' }}>
          <p style={{ fontSize: 11, color: 'var(--text-secondary, #7A8FA3)', margin: '0 0 4px 0' }}>Interest Rate Range</p>
          <p style={{ fontSize: 18, fontWeight: 700, color: '#4A90E2', margin: 0 }}>{loan.interest_rate_range}</p>
        </div>

        <div style={{ padding: '14px', borderRadius: 14, background: 'var(--bg-primary, #F0F4F8)', boxShadow: 'var(--shadow-inset)' }}>
          <p style={{ fontSize: 11, color: 'var(--text-secondary, #7A8FA3)', margin: '0 0 4px 0' }}>Risk Assessment</p>
          <p style={{ fontSize: 16, fontWeight: 700, color: eligColor, textTransform: 'capitalize', margin: 0 }}>{loan.risk_assessment}</p>
        </div>
      </div>

      {loan.rejection_reason && (
        <div style={{ marginTop: 14, padding: '10px 14px', borderRadius: 10, background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', fontSize: 12, color: '#ef4444' }}>
          <strong>Condition / Constraint:</strong> {loan.rejection_reason}
        </div>
      )}
    </div>
  );
};

const RecommendationsCard = ({ score }: { score: ScoreResult }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
    {/* Deterministic Loan Readiness Assessment */}
    <LoanReadinessCard score={score} />

    {/* Explanation & Key Insights */}
    {score.explanation && (
      <div style={{
        background: 'var(--bg-secondary, #F0F4F8)',
        borderRadius: '24px',
        boxShadow: 'var(--shadow-card)',
        padding: '28px 32px',
        border: '1px solid rgba(255,255,255,0.08)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'var(--bg-primary, #F0F4F8)',
              boxShadow: 'var(--shadow-raised)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Sparkles size={16} color="#4A90E2" />
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary, #2C3E50)', margin: 0 }}>AI Credit Analysis</p>
              <p style={{ fontSize: 11, color: 'var(--text-secondary, #7A8FA3)', margin: 0 }}>AI Financial Advisory</p>
            </div>
          </div>

          {score.priority && score.timeframe && (
            <div style={{ display: 'flex', gap: 8 }}>
              <span style={{
                padding: '4px 12px', borderRadius: 999, fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                background: score.priority === 'high' ? 'rgba(239, 68, 68, 0.15)' : score.priority === 'medium' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(34, 197, 94, 0.15)',
                color: score.priority === 'high' ? '#ef4444' : score.priority === 'medium' ? '#f59e0b' : '#22c55e',
              }}>
                Priority: {score.priority}
              </span>
              <span style={{
                padding: '4px 12px', borderRadius: 999, fontSize: 11, fontWeight: 700,
                background: 'var(--bg-primary, #F0F4F8)', color: '#4A90E2',
                boxShadow: 'var(--shadow-raised)',
              }}>
                ⏱ {score.timeframe}
              </span>
            </div>
          )}
        </div>

        <p style={{ fontSize: 15, lineHeight: 1.7, color: 'var(--text-primary, #4A5568)', marginBottom: score.insights && score.insights.length > 0 ? 16 : 0 }}>{score.explanation}</p>

        {score.insights && score.insights.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            {score.insights.map((insight, idx) => (
              <div key={idx} style={{ fontSize: 13, color: 'var(--text-primary, #334155)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: insight.toLowerCase().includes('strength') ? '#22c55e' : '#f59e0b', fontWeight: 700 }}>●</span>
                <span>{insight}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    )}

    {/* Recommendations */}
    {score.recommendations.length > 0 && (
      <div style={{
        background: 'var(--bg-secondary, #F0F4F8)',
        borderRadius: '24px',
        boxShadow: 'var(--shadow-card)',
        padding: '28px 32px',
        border: '1px solid rgba(255,255,255,0.08)',
      }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary, #2C3E50)', marginBottom: 18, marginTop: 0 }}>
          Actionable Action Plan (Numeric Targets)
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {score.recommendations.map((rec, i) => (
            <div key={i} style={{
              display: 'flex', gap: 14, alignItems: 'flex-start',
              padding: '14px 18px', borderRadius: 14,
              background: 'var(--bg-primary, #F0F4F8)',
              boxShadow: 'var(--shadow-inset)',
              borderLeft: '4px solid #4A90E2',
            }}>
              <span style={{
                width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                background: 'linear-gradient(135deg, #4A90E2, #357ABD)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 700, color: '#fff',
              }}>{i + 1}</span>
              <p style={{ fontSize: 14, color: 'var(--text-primary, #4A5568)', lineHeight: 1.6, margin: 0 }}>{rec}</p>
            </div>
          ))}
        </div>
      </div>
    )}
  </div>
);

// ─── History Section ──────────────────────────────────────────────────────────

// ─── History Section ──────────────────────────────────────────────────────────

interface HistorySectionProps {
  onLoad: boolean;
  onSelectHistory?: (uploadId: string) => void;
  onDeleteHistory?: (uploadId: string) => void;
  onGoToUpload?: () => void;
}

const HistorySection = ({ onLoad, onSelectHistory, onDeleteHistory, onGoToUpload }: HistorySectionProps) => {
  const [history, setHistory] = useState<HistoryScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const PER_PAGE = 5;

  const load = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await nodeApiClient.scores.history(PER_PAGE, p * PER_PAGE);
      setHistory(res.scores);
      setTotal(res.total_count);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (onLoad) load(page); }, [onLoad, page, load]);

  const handleDelete = async (e: React.MouseEvent, item: HistoryScore) => {
    e.stopPropagation();
    const idToDelete = item.upload_id || item.score_id;
    try {
      await nodeApiClient.statements.delete(idToDelete);
      const newTotal = Math.max(0, total - 1);
      setTotal(newTotal);

      if (onDeleteHistory) onDeleteHistory(idToDelete);

      if (newTotal === 0) {
        setHistory([]);
        setPage(0);
      } else {
        const maxPage = Math.ceil(newTotal / PER_PAGE) - 1;
        const targetPage = Math.min(page, Math.max(0, maxPage));
        setPage(targetPage);
        // Automatically reload targetPage so the next record shifts into view!
        load(targetPage);
      }
    } catch {
      // ignore
    }
  };

  const Trend = ({ val }: { val: number }) => {
    if (val >= 70) return <TrendingUp size={16} color="#22c55e" />;
    if (val >= 45) return <Minus size={16} color="#f59e0b" />;
    return <TrendingDown size={16} color="#ef4444" />;
  };

  return (
    <div style={{
      background: 'var(--bg-secondary, #F0F4F8)',
      borderRadius: '24px',
      boxShadow: 'var(--shadow-card)',
      padding: '28px 32px',
      border: '1px solid rgba(255,255,255,0.08)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary, #2C3E50)', display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
          <Clock size={18} color="#4A90E2" /> Score History
        </p>
        <p style={{ fontSize: 12, color: 'var(--text-secondary, #7A8FA3)', margin: 0 }}>{total} records</p>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '32px 0' }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid rgba(255,255,255,0.1)', borderTop: '3px solid #4A90E2', animation: 'spin 1s linear infinite' }} />
        </div>
      ) : history.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-secondary, #7A8FA3)' }}>
          <BarChart2 size={44} color="#4A90E2" style={{ marginBottom: 16 }} />
          <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary, #2C3E50)', margin: '0 0 8px 0' }}>
            No History Records Found
          </p>
          <p style={{ fontSize: 13, color: 'var(--text-secondary, #7A8FA3)', margin: '0 0 20px 0' }}>
            You have no saved statement analysis records. Upload a new bank statement PDF to generate your credit score.
          </p>
          {onGoToUpload && (
            <button
              onClick={onGoToUpload}
              style={{
                padding: '10px 22px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #4A90E2, #357ABD)',
                color: '#FFFFFF',
                fontWeight: 700,
                fontSize: '13px',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(74, 144, 226, 0.35)',
                transition: 'all 0.2s ease',
              }}
            >
              Upload New Statement PDF
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {history.map((item) => {
            const color = getBandColor(item.score_band);
            return (
              <div key={item.score_id}
                onClick={() => onSelectHistory && onSelectHistory(item.upload_id || item.score_id)}
                title="Click to view AI suggestions for this score"
                style={{
                  display: 'flex', alignItems: 'center', gap: 16,
                  padding: '14px 18px', borderRadius: 16,
                  background: 'var(--bg-primary, #F0F4F8)',
                  boxShadow: 'var(--shadow-raised)',
                  transition: 'all 0.2s ease', cursor: 'pointer',
                  border: '1px solid rgba(255,255,255,0.05)',
                }}
              >
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: `${color}18`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <Trend val={item.score_value} />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary, #7A8FA3)', marginBottom: 2 }}>{formatDate(item.calculated_at)}</p>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary, #2C3E50)', margin: 0 }}>Statement Evaluation</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: 22, fontWeight: 800, color, margin: 0 }}>
                    {item.score_value}
                  </p>
                  <p style={{ fontSize: 11, color, fontWeight: 600, margin: 0 }}>{item.score_band}</p>
                </div>

                {/* Delete Button */}
                <button
                  onClick={(e) => handleDelete(e, item)}
                  title="Delete from history"
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: '#ef4444', padding: '8px', borderRadius: '10px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            );
          })}

          {/* Pagination */}
          {total > PER_PAGE && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 8 }}>
              <NmButton size="sm" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>← Prev</NmButton>
              <span style={{ fontSize: 13, color: 'var(--text-secondary, #7A8FA3)', alignSelf: 'center' }}>{page + 1} / {Math.ceil(total / PER_PAGE)}</span>
              <NmButton size="sm" onClick={() => setPage((p) => p + 1)} disabled={(page + 1) * PER_PAGE >= total}>Next →</NmButton>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Score Line Chart Component (Theme Adaptive - Light & Dark Modes) ────────

const ScoreLineChart = ({ history }: { history: HistoryScore[] }) => {
  if (!history || history.length === 0) return null;

  const points = [...history].reverse();
  const width = 650;
  const height = 210;
  const padding = 40;

  const minVal = 0;
  const maxVal = 100;

  const getX = (idx: number) => {
    if (points.length === 1) return width / 2;
    return padding + (idx / (points.length - 1)) * (width - 2 * padding);
  };

  const getY = (val: number) => {
    return height - padding - ((val - minVal) / (maxVal - minVal)) * (height - 2 * padding);
  };

  const pathD = points.reduce((acc, pt, idx) => {
    const x = getX(idx);
    const y = getY(pt.score_value);
    return idx === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
  }, '');

  const areaD = points.length > 1
    ? `${pathD} L ${getX(points.length - 1)} ${height - padding} L ${getX(0)} ${height - padding} Z`
    : '';

  return (
    <div style={{
      width: '100%',
      overflowX: 'auto',
      background: 'var(--bg-primary, #F8FAFC)',
      borderRadius: '20px',
      padding: '20px 16px 12px 16px',
      border: '1px solid rgba(255,255,255,0.08)',
      boxShadow: 'var(--shadow-inset)',
    }}>
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', maxHeight: '230px' }}>
        <defs>
          <linearGradient id="scoreThemeGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4A90E2" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#4A90E2" stopOpacity="0.0" />
          </linearGradient>
          <filter id="svgGlowLine" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Dynamic Grid lines */}
        {[25, 50, 75, 100].map((val) => (
          <g key={val}>
            <line
              x1={padding}
              y1={getY(val)}
              x2={width - padding}
              y2={getY(val)}
              stroke="var(--text-secondary, #7A8FA3)"
              strokeOpacity="0.25"
              strokeDasharray="4 4"
            />
            <text x={12} y={getY(val) + 4} fill="var(--text-secondary, #7A8FA3)" fontSize="11" fontWeight="700">
              {val}
            </text>
          </g>
        ))}

        {/* Single point horizontal benchmark line */}
        {points.length === 1 && (
          <line
            x1={padding}
            y1={getY(points[0].score_value)}
            x2={width - padding}
            y2={getY(points[0].score_value)}
            stroke="#4A90E2"
            strokeWidth="2.5"
            strokeDasharray="6 4"
          />
        )}

        {/* Gradient fill under line */}
        {areaD && <path d={areaD} fill="url(#scoreThemeGrad)" />}

        {/* Smooth SVG Line */}
        {points.length > 1 && (
          <path
            d={pathD}
            fill="none"
            stroke="#4A90E2"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#svgGlowLine)"
          />
        )}

        {/* Dynamic Data points */}
        {points.map((pt, idx) => {
          const x = getX(idx);
          const y = getY(pt.score_value);
          const color = getBandColor(pt.score_band);
          return (
            <g key={pt.score_id || idx}>
              <circle cx={x} cy={y} r="8" fill="var(--bg-secondary, #FFFFFF)" stroke={color} strokeWidth="3.5" filter="url(#svgGlowLine)" />
              <rect x={x - 18} y={y - 28} width="36" height="18" rx="9" fill="var(--bg-secondary, #1E293B)" stroke={color} strokeWidth="1" />
              <text x={x} y={y - 15} fill="var(--text-primary, #FFFFFF)" fontSize="11" fontWeight="800" textAnchor="middle">
                {pt.score_value}
              </text>
              <text x={x} y={height - 10} fill="var(--text-secondary, #7A8FA3)" fontSize="10" fontWeight="600" textAnchor="middle">
                {pt.calculated_at ? new Date(pt.calculated_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : `Eval ${idx + 1}`}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

const AnalyticsView = ({ score, onGoToUpload }: { score: ScoreResult | null; onGoToUpload?: () => void }) => {
  const [historyScores, setHistoryScores] = useState<HistoryScore[]>([]);
  const [loading, setLoading] = useState(true);

  // Re-fetch history whenever a new PDF score comes in (score.score_id changes)
  useEffect(() => {
    setLoading(true);
    nodeApiClient.scores.history(50)
      .then((res) => {
        if (res && res.scores) {
          setHistoryScores(res.scores);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [score?.score_id]);

  const totalHistoryCount = historyScores.length;
  const currentTxs = score?.extracted_transactions || [];
  const hasData = Boolean(score || totalHistoryCount > 0);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid rgba(255,255,255,0.1)', borderTop: '3px solid #4A90E2', animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  if (!hasData) {
    return (
      <div style={{
        background: 'var(--bg-secondary, #F0F4F8)',
        borderRadius: '24px',
        boxShadow: 'var(--shadow-card)',
        padding: '48px 32px',
        textAlign: 'center',
        border: '1px solid rgba(255,255,255,0.08)',
        animation: 'fadeIn 0.4s ease',
      }}>
        <BarChart2 size={48} color="#4A90E2" style={{ marginBottom: 16 }} />
        <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary, #2C3E50)', margin: '0 0 10px 0' }}>
          No Analytics Data Available
        </h2>
        <p style={{ fontSize: 14, color: 'var(--text-secondary, #7A8FA3)', maxWidth: 480, margin: '0 auto 24px', lineHeight: 1.6 }}>
          You have no uploaded bank statements or history records. Upload a bank statement PDF to view your cash flow breakdown, category spending distribution, and credit score trajectory over time.
        </p>
        {onGoToUpload && (
          <button
            onClick={onGoToUpload}
            style={{
              padding: '12px 24px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #4A90E2, #357ABD)',
              color: '#FFFFFF',
              fontWeight: 700,
              fontSize: '14px',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(74, 144, 226, 0.4)',
              transition: 'all 0.2s ease',
            }}
          >
            Upload New Statement PDF
          </button>
        )}
      </div>
    );
  }

  const essentialCount = currentTxs.filter((t) => t.category === 'essential_spend').length;
  const discretionaryCount = currentTxs.filter((t) => t.category === 'discretionary_spend').length;
  const incomeCount = currentTxs.filter((t) => t.category === 'income' || t.transaction_type === 'Credit').length;
  const transferCount = currentTxs.filter((t) => t.category === 'internal_transfer').length;
  const totalCount = currentTxs.length || 1;

  const avgHistoryScore = totalHistoryCount > 0
    ? Math.round(historyScores.reduce((acc, h) => acc + h.score_value, 0) / totalHistoryCount)
    : (score?.score_value || 0);

  const displayScore = score?.score_value || avgHistoryScore;
  const metrics = score?.metrics || {
    income_regularity: displayScore,
    savings_ratio: displayScore >= 70 ? 75 : 45,
    spending_discipline: displayScore >= 60 ? 70 : 40,
    bounce_frequency: 100,
    balance_trend: displayScore >= 65 ? 75 : 50,
  };

  const metricBars = [
    { label: 'Income Regularity', val: metrics.income_regularity || 0, color: '#4A90E2' },
    { label: 'Savings Ratio', val: metrics.savings_ratio || 0, color: '#22c55e' },
    { label: 'Spending Discipline', val: metrics.spending_discipline || 0, color: '#f59e0b' },
    { label: 'Bounce Discipline', val: metrics.bounce_frequency || 0, color: '#ef4444' },
    { label: 'Balance Trend', val: metrics.balance_trend !== null ? metrics.balance_trend : 50, color: '#a855f7' },
  ];

  // Detect improvement from previous statement
  const sortedHistory = [...historyScores].sort(
    (a, b) => new Date(b.calculated_at).getTime() - new Date(a.calculated_at).getTime()
  );
  const previousScore = sortedHistory.length > 1 ? sortedHistory[1] : null;
  const scoreDelta = score && previousScore
    ? score.score_value - previousScore.score_value
    : null;

  const improvementNote = scoreDelta !== null
    ? scoreDelta > 0
      ? `📈 Your score improved by +${scoreDelta} points compared to your previous statement (${previousScore!.score_value}/100). Your remedies are working — keep it up!`
      : scoreDelta < 0
      ? `📉 Your score declined by ${Math.abs(scoreDelta)} points vs your previous statement (${previousScore!.score_value}/100). Review the action plan below to reverse this trend.`
      : `➡️ Your score is unchanged from your previous statement (${previousScore!.score_value}/100). Consistent improvement requires sustained effort over 2–3 months.`
    : null;

  // Overall Historical Synthesis Advisory Text
  const overallAdvisory = score?.explanation || (
    totalHistoryCount > 0
      ? `Based on ${totalHistoryCount} analyzed statement${totalHistoryCount > 1 ? 's' : ''} (overall avg: ${avgHistoryScore}/100), your financial trajectory shows ${avgHistoryScore >= 70 ? 'strong' : avgHistoryScore >= 50 ? 'moderate' : 'developing'} creditworthiness. ${avgHistoryScore >= 70 ? 'Maintain steady salary credits and a positive savings buffer to secure optimal loan terms.' : 'Focus on reducing discretionary spend, clearing outstanding bounce fees, and building 3+ months of clean deposit history.'}`
      : 'Upload your bank or UPI statements to track score progress, transaction distribution, and financial health over time.'
  );

  const overallRecommendations = (score?.recommendations && score.recommendations.length > 0)
    ? score.recommendations
    : [
        'Maintain steady monthly income deposits to solidify Income Regularity.',
        'Keep non-essential/discretionary transfers below 25% of total outflow.',
        'Build a continuous 3-month clean transaction history with zero bounce fees.',
      ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, animation: 'fadeIn 0.4s ease' }}>

      {/* ── Historical Score Progression Bar/Area Chart ── */}
      {historyScores.length > 0 && (
        <div className="card-hover-effect" style={{
          background: 'var(--bg-secondary, #F0F4F8)',
          borderRadius: '24px',
          boxShadow: 'var(--shadow-card)',
          padding: '28px 32px',
          border: '1px solid rgba(255,255,255,0.08)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary, #2C3E50)', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <TrendingUp size={20} color="#4A90E2" /> Historical Score Trajectory & Line Graph
              </h2>
              <p style={{ fontSize: 12, color: 'var(--text-secondary, #7A8FA3)', margin: '4px 0 0 0' }}>
                Progression across {totalHistoryCount} historical statement evaluations (Overall Avg: {avgHistoryScore}/100)
              </p>
            </div>
            <span style={{ padding: '6px 14px', borderRadius: 999, fontSize: 12, fontWeight: 700, background: 'rgba(74, 144, 226, 0.15)', color: '#4A90E2' }}>
              {totalHistoryCount} Statements Analyzed
            </span>
          </div>

          <ScoreLineChart history={historyScores} />
        </div>
      )}

      {/* ── Metric Performance Bar Charts ── */}
      <div style={{
        background: 'var(--bg-secondary, #F0F4F8)',
        borderRadius: '24px',
        boxShadow: 'var(--shadow-card)',
        padding: '28px 32px',
        border: '1px solid rgba(255,255,255,0.08)',
      }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary, #2C3E50)', margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: 10 }}>
          <BarChart2 size={20} color="#4A90E2" /> Financial Analytics & Performance Metrics
        </h2>
        <p style={{ fontSize: 13, color: 'var(--text-secondary, #7A8FA3)', margin: '0 0 24px 0' }}>
          {score
            ? `Performance breakdown from ${currentTxs.length} extracted statement transactions`
            : `Overall aggregated metrics across all ${totalHistoryCount || 1} historical uploaded statements`}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {metricBars.map((m) => (
            <div key={m.label} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 600 }}>
                <span style={{ color: 'var(--text-primary, #2C3E50)' }}>{m.label}</span>
                <span style={{ color: m.color, fontWeight: 700 }}>{m.val} / 100</span>
              </div>
              <div style={{ height: 10, borderRadius: 99, background: 'rgba(255,255,255,0.08)', overflow: 'hidden', boxShadow: 'var(--shadow-inset)' }}>
                <div style={{
                  height: '100%', borderRadius: 99,
                  width: `${Math.min(100, Math.max(0, m.val))}%`,
                  background: m.color,
                  transition: 'width 1s ease',
                }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Transaction Category Distribution Graph ── */}
      {currentTxs.length > 0 && (
        <div style={{
          background: 'var(--bg-secondary, #F0F4F8)',
          borderRadius: '24px',
          boxShadow: 'var(--shadow-card)',
          padding: '28px 32px',
          border: '1px solid rgba(255,255,255,0.08)',
        }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary, #2C3E50)', margin: '0 0 16px 0' }}>
            Category Transaction Breakdown & Graph
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 20 }}>
            <div style={{ padding: '16px', borderRadius: 14, background: 'var(--bg-primary, #F0F4F8)', borderLeft: '4px solid #4A90E2', boxShadow: 'var(--shadow-inset)' }}>
              <p style={{ fontSize: 12, color: 'var(--text-secondary, #7A8FA3)', margin: 0 }}>Income Transactions</p>
              <p style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary, #2C3E50)', margin: '4px 0 0 0' }}>{incomeCount} entries</p>
            </div>
            <div style={{ padding: '16px', borderRadius: 14, background: 'var(--bg-primary, #F0F4F8)', borderLeft: '4px solid #22c55e', boxShadow: 'var(--shadow-inset)' }}>
              <p style={{ fontSize: 12, color: 'var(--text-secondary, #7A8FA3)', margin: 0 }}>Essential Spending</p>
              <p style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary, #2C3E50)', margin: '4px 0 0 0' }}>{essentialCount} entries</p>
            </div>
            <div style={{ padding: '16px', borderRadius: 14, background: 'var(--bg-primary, #F0F4F8)', borderLeft: '4px solid #f59e0b', boxShadow: 'var(--shadow-inset)' }}>
              <p style={{ fontSize: 12, color: 'var(--text-secondary, #7A8FA3)', margin: 0 }}>Discretionary Spending</p>
              <p style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary, #2C3E50)', margin: '4px 0 0 0' }}>{discretionaryCount} entries</p>
            </div>
            <div style={{ padding: '16px', borderRadius: 14, background: 'var(--bg-primary, #F0F4F8)', borderLeft: '4px solid #a855f7', boxShadow: 'var(--shadow-inset)' }}>
              <p style={{ fontSize: 12, color: 'var(--text-secondary, #7A8FA3)', margin: 0 }}>Internal Transfers</p>
              <p style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary, #2C3E50)', margin: '4px 0 0 0' }}>{transferCount} (excluded)</p>
            </div>
          </div>

          <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary, #7A8FA3)', marginBottom: 8 }}>
            Volume Distribution Graph
          </p>
          <div style={{ height: 16, borderRadius: 99, background: 'rgba(255,255,255,0.08)', overflow: 'hidden', display: 'flex', boxShadow: 'var(--shadow-inset)' }}>
            <div style={{ width: `${(incomeCount / totalCount) * 100}%`, background: '#4A90E2' }} title="Income" />
            <div style={{ width: `${(essentialCount / totalCount) * 100}%`, background: '#22c55e' }} title="Essential" />
            <div style={{ width: `${(discretionaryCount / totalCount) * 100}%`, background: '#f59e0b' }} title="Discretionary" />
            <div style={{ width: `${(transferCount / totalCount) * 100}%`, background: '#a855f7' }} title="Transfers" />
          </div>
        </div>
      )}

      {/* ── Improvement / Regression Note ── */}
      {improvementNote && (
        <div style={{
          background: scoreDelta! > 0 ? 'rgba(34,197,94,0.08)' : scoreDelta! < 0 ? 'rgba(239,68,68,0.08)' : 'rgba(74,144,226,0.08)',
          borderRadius: '20px',
          padding: '18px 24px',
          border: `1px solid ${scoreDelta! > 0 ? 'rgba(34,197,94,0.3)' : scoreDelta! < 0 ? 'rgba(239,68,68,0.3)' : 'rgba(74,144,226,0.3)'}`,
          fontSize: 14, lineHeight: 1.7,
          color: 'var(--text-primary, #2C3E50)',
          fontWeight: 600,
        }}>
          {improvementNote}
        </div>
      )}

      {/* ── Overall Suggestion Box (All Previous History Data Considered) ── */}
      <div style={{
        background: 'var(--bg-secondary, #F0F4F8)',
        borderRadius: '24px',
        boxShadow: 'var(--shadow-card)',
        padding: '28px 32px',
        border: '1px solid rgba(255,255,255,0.08)',
        borderLeft: '5px solid #4A90E2',
      }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary, #2C3E50)', margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Sparkles size={18} color="#4A90E2" /> AI Advisory — Historical Multi-Statement Synthesis ({totalHistoryCount} statement{totalHistoryCount !== 1 ? 's' : ''}, avg {avgHistoryScore}/100)
        </h3>
        <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--text-primary, #4A5568)', margin: 0 }}>
          {overallAdvisory}
        </p>
      </div>

      {/* ── Steps to Get (Action Plan Targets) ── */}
      <div style={{
        background: 'var(--bg-secondary, #F0F4F8)',
        borderRadius: '24px',
        boxShadow: 'var(--shadow-card)',
        padding: '28px 32px',
        border: '1px solid rgba(255,255,255,0.08)',
      }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary, #2C3E50)', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Shield size={18} color="#22c55e" /> Steps to Get (Action Plan Targets)
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {overallRecommendations.map((rec, i) => (
            <div key={i} style={{
              display: 'flex', gap: 14, alignItems: 'flex-start',
              padding: '14px 18px', borderRadius: 14,
              background: 'var(--bg-primary, #F0F4F8)',
              boxShadow: 'var(--shadow-inset)',
              borderLeft: '4px solid #22c55e',
            }}>
              <span style={{
                width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                background: 'linear-gradient(135deg, #22c55e 0%, #15803d 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 700, color: '#fff',
              }}>{i + 1}</span>
              <p style={{ fontSize: 14, color: 'var(--text-primary, #4A5568)', lineHeight: 1.6, margin: 0 }}>{rec}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

interface ScoreZeroDashboardProps {
  onBackToLanding?: () => void;
}

export function ScoreZeroDashboard({ onBackToLanding }: ScoreZeroDashboardProps) {
  const { user, logout } = useAuth();
  const [currentScore, setCurrentScore] = useState<ScoreResult | null>(null);
  // latestScore: auto-loaded from backend on mount so AI Advisory works even
  // if the user hasn't uploaded a new PDF in the current session.
  const [latestScore, setLatestScore] = useState<ScoreResult | null>(null);
  const [activeNavTab, setActiveNavTab] = useState<NavTab>('dashboard');
  const [suggestionsOnlyMode, setSuggestionsOnlyMode] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [uploadTrigger, setUploadTrigger] = useState(0);

  // Welcome-back banner: shown once per component mount (i.e. every fresh login/navigation to dashboard)
  const [showWelcomeBack, setShowWelcomeBack] = useState(false);
  const welcomeShownRef = useRef(false);

  // Clean up stale sessionStorage key from older version of this component
  useEffect(() => { sessionStorage.removeItem('sz_welcome_shown'); }, []);

  // Auto-load the most recent score from history so tabs (AI Advisory, Analytics) work without a fresh upload
  useEffect(() => {
    nodeApiClient.scores.latest()
      .then((score) => {
        if (score) {
          setLatestScore(score);
          // Show welcome-back banner once per mount — useRef prevents double-trigger in StrictMode
          if (!welcomeShownRef.current) {
            welcomeShownRef.current = true;
            setShowWelcomeBack(true);
            // Auto-dismiss after 6 seconds
            const t = setTimeout(() => setShowWelcomeBack(false), 6000);
            return () => clearTimeout(t);
          }
        }
      })
      .catch(() => {});
  }, []);

  // The "active" score to use across tabs: prefer a freshly-uploaded one, fall back to history
  const activeScore = currentScore ?? latestScore;

  const showToast = (msg: string, type: 'success' | 'error' | 'info') => setToast({ msg, type });

  const handleTriggerUpload = () => {
    setActiveNavTab('dashboard');
    setSuggestionsOnlyMode(false);
    setCurrentScore(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setUploadTrigger((prev) => prev + 1);
  };

  const handleScoreReady = (score: ScoreResult) => {
    setCurrentScore(score);
    setSuggestionsOnlyMode(false);
  };

  const handleSelectHistoryScore = async (uploadId: string) => {
    if (!uploadId || uploadId === 'undefined') return;
    try {
      showToast('Fetching suggestions for history item...', 'info');
      let scoreObj: ScoreResult | null = null;
      try {
        const statusRes = await nodeApiClient.statements.pollStatus(uploadId);
        if (statusRes.score) scoreObj = statusRes.score;
      } catch {
        const scoreRes = await nodeApiClient.scores.latest();
        if (scoreRes) scoreObj = scoreRes;
      }

      if (scoreObj) {
        setCurrentScore(scoreObj);
        setSuggestionsOnlyMode(true);
        setActiveNavTab('dashboard');
        showToast('Displaying AI suggestions for selected history score', 'success');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch {
      showToast('Could not load history score suggestions', 'error');
    }
  };

  const handleDownloadReport = async () => {
    if (!currentScore) return;
    setIsDownloading(true);
    try {
      const report = await nodeApiClient.scores.report(currentScore.upload_id);
      const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `ScoreZero_Report_${currentScore.score_id.slice(0, 8)}.json`;
      a.click(); URL.revokeObjectURL(url);
      showToast('Report downloaded!', 'success');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Download failed';
      showToast(msg, 'error');
    } finally {
      setIsDownloading(false);
    }
  };

  const METRICS_CONFIG: { key: keyof ScoreMetrics; label: string; Icon: typeof Activity; color: string; desc: string }[] = [
    { key: 'income_regularity', label: 'Income Regularity', Icon: DollarSign, color: '#4A90E2', desc: 'Consistency of deposits' },
    { key: 'savings_ratio', label: 'Savings Ratio', Icon: TrendingUp, color: '#22c55e', desc: 'Income retained vs spent' },
    { key: 'spending_discipline', label: 'Spending Discipline', Icon: BarChart2, color: '#f59e0b', desc: 'Essential vs discretionary' },
    { key: 'bounce_frequency', label: 'Bounce Frequency', Icon: Zap, color: '#ef4444', desc: 'Penalty & overdraft events' },
    { key: 'balance_trend', label: 'Balance Trend', Icon: Activity, color: '#a855f7', desc: 'End vs start balance' },
  ];

  return (
    <>
      {/* Global CSS injected once */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        
        :root {
          --bg-primary: #F0F4F8;
          --bg-secondary: #E6EDF5;
          --text-primary: #2C3E50;
          --text-secondary: #7A8FA3;
          --accent-primary: #4A90E2;
          --shadow-card: -8px -8px 24px rgba(255,255,255,0.85), 8px 8px 24px rgba(163,177,198,0.45);
          --shadow-inset: inset -3px -3px 8px rgba(255,255,255,0.8), inset 3px 3px 8px rgba(163,177,198,0.35);
          --shadow-raised: -4px -4px 10px rgba(255,255,255,0.85), 4px 4px 10px rgba(163,177,198,0.4);
        }

        :root[data-theme="dark"] {
          --bg-primary: #121827;
          --bg-secondary: #1F2937;
          --text-primary: #F3F4F6;
          --text-secondary: #9CA3AF;
          --accent-primary: #60A5FA;
          --shadow-card: -6px -6px 18px rgba(255,255,255,0.02), 6px 6px 18px rgba(0,0,0,0.6);
          --shadow-inset: inset -3px -3px 8px rgba(255,255,255,0.02), inset 3px 3px 8px rgba(0,0,0,0.7);
          --shadow-raised: -4px -4px 10px rgba(255,255,255,0.02), 4px 4px 10px rgba(0,0,0,0.6);
        }

        @keyframes scaleIn { from { opacity:0; transform:scale(0.92); } to { opacity:1; transform:scale(1); } }
        @keyframes slideUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
        @keyframes shimmer { from { background-position: 200% 0; } to { background-position: -200% 0; } }

        .card-hover-effect {
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .card-hover-effect:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 30px rgba(66, 133, 244, 0.25);
        }

        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
        }
      `}</style>

      {/* ── Gemini Ambient Glow Backdrop ── */}
      <GlowBackdrop />

      <div style={{
        minHeight: '100vh',
        background: 'var(--bg-primary, #F0F4F8)',
        fontFamily: "'Inter', -apple-system, sans-serif",
        color: 'var(--text-primary, #2C3E50)',
        padding: '0',
        position: 'relative',
        zIndex: 1,
      }}>

        {/* ── Top Navigation Bar ── */}
        <TopNavBar
          activeTab={activeNavTab}
          onTabChange={(tab) => setActiveNavTab(tab)}
          onTriggerUpload={handleTriggerUpload}
          onOpenSettings={() => setShowSettingsModal(true)}
          onOpenPrivacy={() => setShowPrivacyModal(true)}
          onBackToLanding={onBackToLanding}
        />

        {/* ── Main View Switcher ── */}
        {activeNavTab === 'loan-readiness' ? (
          <LoanReadinessPage onGoToUpload={() => setActiveNavTab('dashboard')} />
        ) : activeNavTab === 'analytics' ? (
          <main style={{ maxWidth: 1000, margin: '0 auto', padding: '20px 16px 60px' }}>
            <AnalyticsView score={activeScore} onGoToUpload={handleTriggerUpload} />
          </main>
        ) : activeNavTab === 'chat-new' ? (
          <main style={{ maxWidth: 950, margin: '0 auto', padding: '16px 12px 60px' }}>
            {activeScore?.upload_id ? (
              <GeminiStatementChat
                uploadId={activeScore.upload_id}
                fileName={`Bank Statement • Score: ${activeScore.score_value}/100 (${activeScore.score_band})`}
                scoreContext={activeScore}
              />
            ) : (
              <div style={{
                background: 'var(--bg-secondary, #F0F4F8)',
                borderRadius: '24px',
                boxShadow: 'var(--shadow-card)',
                padding: '60px 32px',
                textAlign: 'center',
                border: '1px solid rgba(255,255,255,0.08)',
                animation: 'fadeIn 0.4s ease',
              }}>
                <Sparkles size={48} color="#4A90E2" style={{ marginBottom: 16, opacity: 0.7 }} />
                <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary, #2C3E50)', margin: '0 0 10px 0' }}>
                  AI Advisory Needs Your Statement
                </h2>
                <p style={{ fontSize: 14, color: 'var(--text-secondary, #7A8FA3)', maxWidth: 460, margin: '0 auto 28px', lineHeight: 1.7 }}>
                  Upload a bank statement PDF to unlock AI-powered advisory. The AI will analyze your score, spending patterns, and provide personalized recommendations based on your full history.
                </p>
                <button
                  onClick={handleTriggerUpload}
                  style={{
                    padding: '12px 28px', borderRadius: '14px',
                    background: 'linear-gradient(135deg, #4A90E2, #357ABD)',
                    color: '#FFFFFF', fontWeight: 700, fontSize: '14px',
                    border: 'none', cursor: 'pointer',
                    boxShadow: '0 4px 16px rgba(74, 144, 226, 0.4)',
                  }}
                >
                  Upload PDF to Start AI Advisory
                </button>
              </div>
            )}
          </main>
        ) : activeNavTab === 'history' ? (
          <main style={{ maxWidth: 1000, margin: '0 auto', padding: '20px 16px 60px' }}>
            <HistorySection
              onLoad={true}
              onSelectHistory={handleSelectHistoryScore}
              onDeleteHistory={async (deletedId) => {
                showToast('Statement score deleted from history.', 'success');
                if (currentScore && (currentScore.upload_id === deletedId || currentScore.score_id === deletedId)) {
                  setCurrentScore(null);
                  setSuggestionsOnlyMode(false);
                }
                if (latestScore && (latestScore.upload_id === deletedId || latestScore.score_id === deletedId)) {
                  setLatestScore(null);
                }
                // Sync with latest remaining score in backend
                try {
                  const updatedLatest = await nodeApiClient.scores.latest();
                  setLatestScore(updatedLatest);
                } catch {
                  setLatestScore(null);
                }
              }}
              onGoToUpload={handleTriggerUpload}
            />
          </main>
        ) : (
          <main style={{ maxWidth: 1100, margin: '0 auto', padding: '20px 16px 60px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

              {/* ── Welcome Back Banner (Returning Users Only) ── */}
              {showWelcomeBack && (
                <div
                  id="welcome-back-banner"
                  style={{
                    position: 'relative',
                    borderRadius: '20px',
                    padding: '18px 24px',
                    background: 'linear-gradient(135deg, rgba(74,144,226,0.14) 0%, rgba(34,197,94,0.10) 50%, rgba(168,85,247,0.10) 100%)',
                    border: '1.5px solid rgba(74,144,226,0.35)',
                    boxShadow: '0 4px 24px rgba(74,144,226,0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    animation: 'slideUp 0.5s cubic-bezier(0.34,1.56,0.64,1)',
                    overflow: 'hidden',
                  }}
                >
                  {/* Shimmer bar at top */}
                  <div style={{
                    position: 'absolute',
                    top: 0, left: 0, right: 0,
                    height: '3px',
                    background: 'linear-gradient(90deg, #4A90E2, #22c55e, #a855f7, #4A90E2)',
                    backgroundSize: '200% 100%',
                    animation: 'shimmer 2.5s linear infinite',
                    borderRadius: '20px 20px 0 0',
                  }} />

                  {/* Icon */}
                  <div style={{
                    width: 44,
                    height: 44,
                    borderRadius: '14px',
                    background: 'linear-gradient(135deg, #4A90E2, #22c55e)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    boxShadow: '0 4px 12px rgba(74,144,226,0.35)',
                  }}>
                    <Sparkles size={22} color="#FFFFFF" />
                  </div>

                  {/* Text */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      fontSize: '16px',
                      fontWeight: 800,
                      color: 'var(--text-primary, #2C3E50)',
                      margin: '0 0 3px 0',
                      letterSpacing: '-0.2px',
                    }}>
                      Welcome back{user?.name ? `, ${user.name.split(' ')[0]}` : ''}! 👋
                    </p>
                    <p style={{
                      fontSize: '13px',
                      color: 'var(--text-secondary, #7A8FA3)',
                      margin: 0,
                      lineHeight: 1.5,
                    }}>
                      Your ScoreZero financial profile is ready.{latestScore ? ` Last score: ${latestScore.score_value}/100 (${latestScore.score_band}).` : ''} Keep building a stronger credit future.
                    </p>
                  </div>

                  {/* Score badge (if available) */}
                  {latestScore && (
                    <div style={{
                      flexShrink: 0,
                      padding: '6px 14px',
                      borderRadius: '999px',
                      background: `${getBandColor(latestScore.score_band)}18`,
                      border: `1.5px solid ${getBandColor(latestScore.score_band)}40`,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: getBandColor(latestScore.score_band) }} />
                      <span style={{ fontSize: '13px', fontWeight: 700, color: getBandColor(latestScore.score_band) }}>
                        {latestScore.score_value}/100
                      </span>
                    </div>
                  )}

                  {/* Dismiss button */}
                  <button
                    onClick={() => setShowWelcomeBack(false)}
                    title="Dismiss welcome message"
                    aria-label="Dismiss welcome banner"
                    style={{
                      flexShrink: 0,
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--text-secondary, #7A8FA3)',
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '8px',
                      transition: 'color 0.2s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary, #2C3E50)')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary, #7A8FA3)')}
                  >
                    <X size={18} />
                  </button>
                </div>
              )}

              {/* Suggestions-Only Mode when loaded from history */}
              {suggestionsOnlyMode && currentScore ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24, animation: 'fadeIn 0.4s ease' }}>
                  <div style={{
                    background: 'var(--bg-secondary, #F0F4F8)',
                    borderRadius: '24px',
                    boxShadow: 'var(--shadow-card)',
                    padding: '20px 28px',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    flexWrap: 'wrap', gap: 12, borderLeft: '5px solid #4A90E2',
                    borderTop: '1px solid rgba(255,255,255,0.08)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        width: 40, height: 40, borderRadius: 12,
                        background: 'linear-gradient(135deg, #4A90E2, #357ABD)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: 'var(--shadow-raised)',
                      }}>
                        <Sparkles size={20} color="#FFFFFF" />
                      </div>
                      <div>
                        <p style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary, #2C3E50)', margin: 0 }}>
                          AI Suggestions & Action Plan ({currentScore.score_value}/100 • {currentScore.score_band})
                        </p>
                        <p style={{ fontSize: 12, color: 'var(--text-secondary, #7A8FA3)', margin: 0 }}>
                          Showing suggestions for selected statement ({currentScore.score_value}/100 • {currentScore.score_band})
                        </p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <NmButton size="sm" onClick={() => setSuggestionsOnlyMode(false)}>Show Full Score & Gauges</NmButton>
                      <NmButton size="sm" onClick={() => { setCurrentScore(null); setSuggestionsOnlyMode(false); }}>Analyze New PDF</NmButton>
                    </div>
                  </div>

                  <RecommendationsCard score={currentScore} />
                </div>
              ) : (
                <>
                  {/* Score card or Glowing Upload Zone + Search Chat */}
                  {/* Only show ScoreCard after a fresh upload in this session — latestScore is kept
                      for AI Advisory / Analytics tabs but does NOT auto-fill the main dashboard card. */}
                  {currentScore ? (
                    <ScoreCard score={currentScore} onReset={() => setCurrentScore(null)} />
                  ) : (
                    <div style={{
                      position: 'relative',
                      borderRadius: '28px',
                      padding: '24px',
                      background: 'var(--bg-secondary, #121827)',
                      boxShadow: '0 8px 32px rgba(66, 133, 244, 0.25)',
                      border: '1px solid rgba(66, 133, 244, 0.3)',
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '16px',
                    }}>
                      {/* Ambient Glow Blobs behind Upload & Search */}
                      <div style={{
                        position: 'absolute', top: '-40%', right: '-20%',
                        width: '380px', height: '380px', borderRadius: '50%',
                        background: 'radial-gradient(circle, #4285F4 0%, #A142F4 60%, transparent 80%)',
                        filter: 'blur(100px)', opacity: 0.4, pointerEvents: 'none',
                      }} />
                      <div style={{
                        position: 'absolute', bottom: '-40%', left: '-20%',
                        width: '340px', height: '340px', borderRadius: '50%',
                        background: 'radial-gradient(circle, #EA4335 0%, #FBBC05 60%, transparent 80%)',
                        filter: 'blur(100px)', opacity: 0.3, pointerEvents: 'none',
                      }} />

                      <UploadZone onComplete={handleScoreReady} onToast={showToast} uploadTrigger={uploadTrigger} />
                    </div>
                  )}

                  {/* Optional Standalone AI Question Card for this PDF (Visible ONLY if user specified a question) */}
                  {activeScore && (
                    <div style={{ animation: 'fadeIn 0.5s ease 0.15s both' }}>
                      <DashboardQuestionCard score={activeScore} />
                    </div>
                  )}

                  {/* Metrics grid */}
                  {activeScore && (
                    <div style={{ animation: 'fadeIn 0.5s ease 0.2s both' }}>
                      <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary, #2C3E50)', marginBottom: 18 }}>Metric Breakdown</p>
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                        gap: 20,
                      }}>
                        {METRICS_CONFIG.map(({ key, label, Icon, color, desc }) => (
                          <MetricCard
                            key={key}
                            label={label}
                            value={activeScore.metrics[key]}
                            Icon={Icon}
                            color={color}
                            description={desc}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* AI Explanation + Recommendations */}
                  {activeScore && (
                    <div style={{ animation: 'fadeIn 0.5s ease 0.35s both' }}>
                      <RecommendationsCard score={activeScore} />
                    </div>
                  )}
                </>
              )}

              {/* Actions */}
              {activeScore && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, animation: 'fadeIn 0.5s ease 0.5s both' }}>
                  <NmButton onClick={handleDownloadReport} disabled={isDownloading}>
                    <Download size={15} />
                    {isDownloading ? 'Preparing…' : 'Download Report'}
                  </NmButton>

                  {!showDeleteConfirm ? (
                    <NmButton variant="danger" onClick={() => setShowDeleteConfirm(true)}>
                      <Trash2 size={15} /> Delete My Data
                    </NmButton>
                  ) : (
                    <div style={{
                      background: 'var(--bg-secondary, #F0F4F8)',
                      borderRadius: '16px', padding: '16px 20px',
                      display: 'flex', alignItems: 'center', gap: 14, flex: 1,
                      boxShadow: 'var(--shadow-card)',
                    }}>
                      <AlertCircle size={18} color="#ef4444" />
                      <span style={{ fontSize: 13, color: 'var(--text-primary, #2C3E50)', flex: 1 }}>
                        Are you sure? This will delete your current score analysis.
                      </span>
                      <NmButton size="sm" variant="danger" onClick={async () => {
                        try {
                          if (currentScore?.upload_id) await nodeApiClient.statements.delete(currentScore.upload_id);
                          setCurrentScore(null);
                          setSuggestionsOnlyMode(false);
                          setShowDeleteConfirm(false);
                          showToast('Your score data has been deleted.', 'info');
                          try {
                            const updatedLatest = await nodeApiClient.scores.latest();
                            setLatestScore(updatedLatest);
                          } catch {
                            setLatestScore(null);
                          }
                        } catch { showToast('Delete failed.', 'error'); }
                      }}>
                        <Check size={13} /> Confirm
                      </NmButton>
                      <NmButton size="sm" onClick={() => setShowDeleteConfirm(false)}>
                        <X size={13} /> Cancel
                      </NmButton>
                    </div>
                  )}
                </div>
              )}
            </div>
          </main>
        )}

        {/* ── Footer ── */}
        <footer style={{
          background: 'var(--bg-primary, #F0F4F8)',
          borderTop: '1px solid rgba(163,177,198,0.3)',
          padding: '20px 32px',
          textAlign: 'center',
        }}>
          <p style={{ fontSize: 12, color: 'var(--text-secondary, #7A8FA3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', flexWrap: 'wrap', margin: 0 }}>
            <span>ScoreZero Alternative Credit Intelligence</span>
            <span>·</span>
            <span>Not an official credit bureau score</span>
          </p>
        </footer>
      </div>

      {/* Account Settings Modal */}
      {showSettingsModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: 'var(--bg-secondary, #121827)', borderRadius: '24px', padding: '32px', maxWidth: '440px', width: '100%', boxShadow: 'var(--shadow-card)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary, #FFFFFF)', margin: 0 }}>Account Settings</h3>
              <button onClick={() => setShowSettingsModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7A8FA3' }}><X size={20} /></button>
            </div>

            {/* Profile Avatar & Info */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '24px' }}>
              {(user as any)?.avatar_url || (user as any)?.picture ? (
                <img
                  src={(user as any)?.avatar_url || (user as any)?.picture}
                  alt={user?.name || 'User'}
                  style={{ width: 68, height: 68, borderRadius: '50%', objectFit: 'cover', border: '3px solid #4A90E2', marginBottom: 12, boxShadow: '0 4px 16px rgba(74,144,226,0.35)' }}
                />
              ) : (
                <div style={{
                  width: 68, height: 68, borderRadius: '50%',
                  background: 'linear-gradient(135deg, #4A90E2, #357ABD)',
                  color: '#FFFFFF', fontWeight: 800, fontSize: 22,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: 12, boxShadow: '0 4px 16px rgba(74,144,226,0.35)',
                }}>
                  {(user?.name || 'User').slice(0, 2).toUpperCase()}
                </div>
              )}
              <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 999, background: 'rgba(74,144,226,0.15)', color: '#4A90E2', letterSpacing: '0.3px' }}>GOOGLE ACCOUNT VERIFIED</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary, #7A8FA3)', display: 'block', marginBottom: '6px' }}>Full Name</label>
                <input type="text" readOnly value={user?.name || 'User'} style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', background: 'var(--bg-primary, #1F2937)', fontSize: '14px', color: 'var(--text-primary, #FFFFFF)' }} />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary, #7A8FA3)', display: 'block', marginBottom: '6px' }}>Email Address</label>
                <input type="email" readOnly value={user?.email || 'user@scorezero.ai'} style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', background: 'var(--bg-primary, #1F2937)', fontSize: '14px', color: 'var(--text-primary, #FFFFFF)' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => { logout(); onBackToLanding?.(); }} style={{ flex: 1, padding: '12px', borderRadius: '14px', border: '1px solid #ef4444', background: 'rgba(239,68,68,0.1)', color: '#ef4444', fontWeight: 700, cursor: 'pointer' }}>Sign Out</button>
              <button onClick={() => setShowSettingsModal(false)} style={{ flex: 1, padding: '12px', borderRadius: '14px', border: 'none', background: 'linear-gradient(135deg, #4A90E2, #357ABD)', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>Done</button>
            </div>
          </div>
        </div>
      )}

      {/* Privacy & Data Modal */}
      {showPrivacyModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: 'var(--bg-secondary, #121827)', borderRadius: '24px', padding: '32px', maxWidth: '480px', width: '100%', boxShadow: 'var(--shadow-card)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary, #FFFFFF)', margin: 0 }}>Privacy & Data Security Policy</h3>
              <button onClick={() => setShowPrivacyModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7A8FA3' }}><X size={20} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px', fontSize: '13px', lineHeight: 1.6, color: 'var(--text-secondary, #94A3B8)' }}>
              <div style={{ padding: '12px 16px', borderRadius: '14px', background: 'var(--bg-primary, #1F2937)', borderLeft: '4px solid #4A90E2' }}>
                <strong style={{ color: 'var(--text-primary, #FFF)', display: 'block', marginBottom: '2px' }}>🔒 In-Memory PDF Processing</strong>
                Bank statement PDFs are processed strictly in RAM memory to calculate credit metrics and are never written to permanent disk storage.
              </div>

              <div style={{ padding: '12px 16px', borderRadius: '14px', background: 'var(--bg-primary, #1F2937)', borderLeft: '4px solid #22c55e' }}>
                <strong style={{ color: 'var(--text-primary, #FFF)', display: 'block', marginBottom: '2px' }}>🛡️ Zero Third-Party Data Selling</strong>
                Your extracted transactions and personal information are strictly confidential and will never be sold, rented, or shared with third-party lenders or advertisers.
              </div>

              <div style={{ padding: '12px 16px', borderRadius: '14px', background: 'var(--bg-primary, #1F2937)', borderLeft: '4px solid #f59e0b' }}>
                <strong style={{ color: 'var(--text-primary, #FFF)', display: 'block', marginBottom: '2px' }}>🗑️ Complete Data Control</strong>
                You retain total control to delete your score history and extracted statement data anytime via the 1-Click "Delete My Data" feature.
              </div>
            </div>
            <button onClick={() => setShowPrivacyModal(false)} style={{ width: '100%', padding: '12px', borderRadius: '14px', border: 'none', background: 'linear-gradient(135deg, #4A90E2, #357ABD)', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>Close</button>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />
      )}
    </>
  );
}

export default ScoreZeroDashboard;
