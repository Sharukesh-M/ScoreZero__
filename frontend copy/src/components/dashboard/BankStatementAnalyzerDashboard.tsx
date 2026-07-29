import { useState, useEffect } from 'react';
import DashboardHeader from './DashboardHeader';
import StatementUploader from './StatementUploader';
import ScoreGauge from './ScoreGauge';
import BreakdownPanel from './BreakdownPanel';
import AICoachingPanel from './AICoachingPanel';
import AlertState from './AlertState';
import BackendMonitorPanel from './BackendMonitorPanel';
import BackendAnalysisComponent from './BackendAnalysisComponent';
import scoreZeroAPI, {
  type UploadItem,
  type Transaction,
  type ScoreMetrics,
  type RecommendationItem,
  type ScoreRecord,
} from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import {
  AlertCircle,
  RefreshCw,
  Shield,
  Sparkles,
  Activity,
  FileText,
  History,
  Download,
  Lock,
  Trash2,
  UserCheck,
  Terminal,
  Sliders,
} from 'lucide-react';

interface BankStatementAnalyzerDashboardProps {
  onBackToLanding?: () => void;
}

export function BankStatementAnalyzerDashboard({ onBackToLanding }: BankStatementAnalyzerDashboardProps) {
  const { user, isAuthenticated, logout } = useAuth();

  // Primary UI state
  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [activeTab, setActiveTab] = useState<'analyzer' | 'analytics' | 'system' | 'history' | 'account'>('analyzer');

  // Step 1: Upload & Parsing state
  const [currentUpload, setCurrentUpload] = useState<UploadItem | null>(null);
  const [parsedTransactions, setParsedTransactions] = useState<Transaction[]>([]);
  const [lowConfidence, setLowConfidence] = useState(false);
  const [statementDates, setStatementDates] = useState<{ start?: string | null; end?: string | null }>({});

  // Password Prompt Modal
  const [passwordRequired, setPasswordRequired] = useState(false);
  const [pdfPassword, setPdfPassword] = useState('');

  // Step 2: Scoring & AI state
  const [currentScoreId, setCurrentScoreId] = useState<string | null>(null);
  const [currentMetrics, setCurrentMetrics] = useState<ScoreMetrics | null>(null);
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);

  // Async state
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isRecsLoading, setIsRecsLoading] = useState<boolean>(false);
  const [isPdfDownloading, setIsPdfDownloading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // History state
  const [historyScores, setHistoryScores] = useState<ScoreRecord[]>([]);

  // Account deletion confirm modal
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Check Flask backend health on mount
  const checkBackend = async () => {
    setBackendStatus('checking');
    try {
      await scoreZeroAPI.checkHealth();
      setBackendStatus('online');
    } catch {
      setBackendStatus('offline');
    }
  };

  useEffect(() => {
    checkBackend();
  }, []);

  // Fetch score history if authenticated
  const loadHistory = async () => {
    if (!isAuthenticated) return;
    try {
      const res = await scoreZeroAPI.scores.list();
      setHistoryScores(res.scores);
    } catch {
      // Ignore history fetch errors
    }
  };

  useEffect(() => {
    if (activeTab === 'history') {
      loadHistory();
    }
  }, [activeTab, isAuthenticated]);

  // Upload PDF Handler
  const handleUpload = async (file: File) => {
    setIsLoading(true);
    setErrorMsg(null);
    setPasswordRequired(false);

    try {
      // 1. Upload PDF to backend
      const uploadRes = await scoreZeroAPI.uploads.uploadFile(file);
      setCurrentUpload(uploadRes.upload);

      // 2. Parse PDF via backend
      await runParse(uploadRes.upload.upload_id);
      setBackendStatus('online');
    } catch (err: any) {
      setErrorMsg(err.message || 'Upload failed. Please check the PDF file and try again.');
      setIsLoading(false);
    }
  };

  // Run Parse Helper
  const runParse = async (uploadId: string, password?: string) => {
    try {
      const parseRes = await scoreZeroAPI.uploads.parse(uploadId, password);

      if (parseRes.error && parseRes.error.toLowerCase().includes('password')) {
        setPasswordRequired(true);
        setIsLoading(false);
        return;
      }

      if (parseRes.error) {
        throw new Error(parseRes.error);
      }

      setParsedTransactions(parseRes.transactions || []);
      setLowConfidence(parseRes.low_confidence || false);
      setStatementDates({
        start: parseRes.statement_start_date,
        end: parseRes.statement_end_date,
      });

      setPasswordRequired(false);

      // 3. Compute score automatically once parsed
      await runComputeScore(uploadId, parseRes.transactions, parseRes.low_confidence);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to parse statement.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUpload) return;
    setIsLoading(true);
    runParse(currentUpload.upload_id, pdfPassword);
  };

  // Compute Score & Fetch Recommendations
  const runComputeScore = async (uploadId: string, txns: Transaction[], lowConf: boolean) => {
    try {
      const scoreRes = await scoreZeroAPI.scores.compute(uploadId, txns, lowConf);
      setCurrentScoreId(scoreRes.score_id);
      setCurrentMetrics(scoreRes.metrics);

      // Load AI recommendations
      setIsRecsLoading(true);
      try {
        const recsRes = await scoreZeroAPI.recommendations.get(scoreRes.score_id);
        setRecommendations(recsRes.recommendations);
      } catch {
        setRecommendations([]);
      } finally {
        setIsRecsLoading(false);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to compute score.');
    }
  };

  // Download PDF Report
  const handleDownloadReport = async () => {
    if (!currentScoreId) return;
    setIsPdfDownloading(true);
    try {
      await scoreZeroAPI.reports.downloadReportPdf(currentScoreId);
    } catch (err: any) {
      alert(err.message || 'Failed to download report PDF.');
    } finally {
      setIsPdfDownloading(false);
    }
  };

  const handleReset = () => {
    setCurrentUpload(null);
    setParsedTransactions([]);
    setCurrentMetrics(null);
    setCurrentScoreId(null);
    setRecommendations([]);
    setErrorMsg(null);
    setPasswordRequired(false);
  };

  const handleDeleteAccount = async () => {
    try {
      await scoreZeroAPI.account.deleteAccount();
      alert('Account and data permanently deleted.');
      logout();
      if (onBackToLanding) onBackToLanding();
    } catch (err: any) {
      alert(err.message || 'Failed to delete account.');
    }
  };

  return (
    <div className="min-h-screen bg-[#08101C] text-white p-4 sm:p-8 flex flex-col items-center selection:bg-[#27D9FF] selection:text-[#081421]">
      <div className="w-full max-w-5xl">
        {/* Top Header */}
        <DashboardHeader
          onReset={handleReset}
          hasData={Boolean(currentMetrics || errorMsg)}
          onBackToLanding={onBackToLanding}
        />

        {/* Overview Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="p-4 rounded-2xl bg-[#102235] border border-[#27D9FF]/20 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#27D9FF]/10 border border-[#27D9FF]/30 flex items-center justify-center text-[#27D9FF] shrink-0">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-mono text-[#B8C5D0] uppercase tracking-wider block">Backend Engine</span>
              <div className="flex items-center gap-1.5 pt-0.5">
                <span className={`w-2 h-2 rounded-full ${backendStatus === 'online' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                <span className="text-xs font-bold text-white font-mono">
                  {backendStatus === 'online' ? 'Flask Online' : 'Check Port 5000'}
                </span>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#102235] border border-[#27D9FF]/20 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#27D9FF]/10 border border-[#27D9FF]/30 flex items-center justify-center text-[#27D9FF] shrink-0">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-mono text-[#B8C5D0] uppercase tracking-wider block">Privacy Guarantee</span>
              <span className="text-xs font-bold text-white font-mono">100% In-Memory</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#102235] border border-[#27D9FF]/20 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#27D9FF]/10 border border-[#27D9FF]/30 flex items-center justify-center text-[#27D9FF] shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-mono text-[#B8C5D0] uppercase tracking-wider block">Supported Exports</span>
              <span className="text-xs font-bold text-white font-mono">PhonePe & GPay PDF</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#102235] border border-[#27D9FF]/20 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#27D9FF]/10 border border-[#27D9FF]/30 flex items-center justify-center text-[#27D9FF] shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-mono text-[#B8C5D0] uppercase tracking-wider block">AI Cascade</span>
              <span className="text-xs font-bold text-white font-mono">Ollama / Gemini</span>
            </div>
          </div>
        </div>

        {/* Tab Navigation Bar */}
        <div className="flex items-center justify-between mb-6 border-b border-[#27D9FF]/20 pb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('analyzer')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'analyzer'
                  ? 'bg-[#27D9FF] text-[#081421] shadow-[0_0_15px_rgba(39,217,255,0.3)]'
                  : 'text-[#B8C5D0] hover:text-white bg-[#102235]'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Statement Analyzer</span>
            </button>

            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'analytics'
                  ? 'bg-[#27D9FF] text-[#081421] shadow-[0_0_15px_rgba(39,217,255,0.3)]'
                  : 'text-[#B8C5D0] hover:text-white bg-[#102235]'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Engine Analytics</span>
            </button>

            <button
              onClick={() => setActiveTab('system')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'system'
                  ? 'bg-[#27D9FF] text-[#081421] shadow-[0_0_15px_rgba(39,217,255,0.3)]'
                  : 'text-[#B8C5D0] hover:text-white bg-[#102235]'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>API & System Health</span>
            </button>

            {isAuthenticated && (
              <button
                onClick={() => setActiveTab('history')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                  activeTab === 'history'
                    ? 'bg-[#27D9FF] text-[#081421] shadow-[0_0_15px_rgba(39,217,255,0.3)]'
                    : 'text-[#B8C5D0] hover:text-white bg-[#102235]'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>Score History</span>
              </button>
            )}

            {isAuthenticated && (
              <button
                onClick={() => setActiveTab('account')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                  activeTab === 'account'
                    ? 'bg-[#27D9FF] text-[#081421] shadow-[0_0_15px_rgba(39,217,255,0.3)]'
                    : 'text-[#B8C5D0] hover:text-white bg-[#102235]'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Account Settings</span>
              </button>
            )}
          </div>

          {currentScoreId && (
            <button
              onClick={handleDownloadReport}
              disabled={isPdfDownloading}
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-all shadow-md flex items-center gap-2 disabled:opacity-50"
            >
              {isPdfDownloading ? (
                <div className="w-3.5 h-3.5 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              <span>Download PDF Report</span>
            </button>
          )}
        </div>

        {/* Server Offline Warning Banner */}
        {backendStatus === 'offline' && !currentMetrics && (
          <div className="p-4 mb-6 rounded-2xl bg-amber-950/40 border border-amber-500/30 text-xs font-semibold text-amber-300 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                Flask backend (http://localhost:5000) is offline. Make sure to run <code>python3 backend/run.py</code>.
              </span>
            </div>
            <button
              onClick={checkBackend}
              className="px-3 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/30 transition-all flex items-center gap-1 shrink-0"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Retry</span>
            </button>
          </div>
        )}

        {/* TAB 1: STATEMENT ANALYZER */}
        {activeTab === 'analyzer' && (
          <>
            {!currentMetrics && !errorMsg && !passwordRequired && (
              <StatementUploader onUpload={handleUpload} isLoading={isLoading} />
            )}

            {/* Password Prompt Form */}
            {passwordRequired && (
              <div className="w-full max-w-lg mx-auto p-8 rounded-3xl bg-[#102235] border border-amber-500/40 space-y-4 shadow-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center">
                    <Lock className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Password Protected Statement</h3>
                    <p className="text-xs text-[#B8C5D0]">Enter password to decrypt and parse PDF statement.</p>
                  </div>
                </div>

                <form onSubmit={handlePasswordSubmit} className="space-y-4 pt-2">
                  <input
                    type="password"
                    required
                    placeholder="Enter PDF password"
                    value={pdfPassword}
                    onChange={(e) => setPdfPassword(e.target.value)}
                    className="w-full p-3 rounded-xl bg-[#081421] border border-[#27D9FF]/30 text-sm text-white focus:outline-none focus:border-[#27D9FF]"
                  />

                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={handleReset}
                      className="text-xs text-[#B8C5D0] hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="px-5 py-2.5 rounded-xl bg-[#27D9FF] text-[#081421] font-bold text-xs hover:bg-[#4BE7FF]"
                    >
                      {isLoading ? 'Decrypting...' : 'Decrypt & Parse'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Error Alert */}
            {errorMsg && !isLoading && (
              <AlertState message={errorMsg} onRetry={handleReset} />
            )}

            {/* Score Results View */}
            {currentMetrics && !isLoading && (
              <div className="space-y-10 animate-fadeIn">
                <ScoreGauge
                  score={currentMetrics.score_value}
                  totalTransactions={parsedTransactions.length}
                  privacyNotice="PDF statements are parsed in-memory using Flask. Zero raw bank transactions or identity data are stored on disk."
                />

                <BreakdownPanel metrics={currentMetrics} lowConfidence={lowConfidence} />

                <AICoachingPanel recommendations={recommendations} isLoading={isRecsLoading} />

                {/* Parsed Transactions Review Table */}
                {parsedTransactions.length > 0 && (
                  <div className="w-full bg-[#102235] border border-[#27D9FF]/20 rounded-3xl p-6 sm:p-8 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-lg font-bold text-white flex items-center gap-2">
                        <span>Extracted Statement Transactions</span>
                        <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-[#27D9FF]/10 text-[#27D9FF] border border-[#27D9FF]/30">
                          {parsedTransactions.length} items
                        </span>
                      </h4>
                      {statementDates.start && statementDates.end && (
                        <span className="text-xs font-mono text-[#B8C5D0]">
                          Period: {statementDates.start} to {statementDates.end}
                        </span>
                      )}
                    </div>

                    <div className="overflow-x-auto max-h-80 border border-[#27D9FF]/15 rounded-xl">
                      <table className="w-full text-left text-xs text-slate-300">
                        <thead className="bg-[#081421] text-[#27D9FF] font-mono uppercase text-[10px] sticky top-0">
                          <tr>
                            <th className="p-3">Date</th>
                            <th className="p-3">Description</th>
                            <th className="p-3">Type</th>
                            <th className="p-3">Category</th>
                            <th className="p-3 text-right">Amount (₹)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {parsedTransactions.slice(0, 30).map((t, idx) => (
                            <tr key={idx} className="hover:bg-[#081421]/50 font-medium">
                              <td className="p-3 whitespace-nowrap font-mono text-slate-400">{t.date}</td>
                              <td className="p-3 max-w-xs truncate">{t.description}</td>
                              <td className="p-3 font-mono">
                                <span className={t.transaction_type === 'Credit' ? 'text-emerald-400' : 'text-slate-400'}>
                                  {t.transaction_type}
                                </span>
                              </td>
                              <td className="p-3 font-mono text-[10px]">
                                <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 uppercase">
                                  {t.category.replace('_', ' ')}
                                </span>
                              </td>
                              <td className="p-3 text-right font-mono font-bold text-white">
                                ₹{t.amount.toLocaleString('en-IN')}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* TAB 2: ENGINE ANALYTICS STUDIO */}
        {activeTab === 'analytics' && (
          <BackendAnalysisComponent />
        )}

        {/* TAB 3: SYSTEM & API MONITOR */}
        {activeTab === 'system' && (
          <BackendMonitorPanel
            currentUser={user}
            backendStatus={backendStatus}
            onRecheckBackend={checkBackend}
          />
        )}

        {/* TAB 3: HISTORY LOG */}
        {activeTab === 'history' && (
          <div className="space-y-4 animate-fadeIn">
            <h3 className="text-xl font-bold text-white">Score History & Trend Log</h3>
            {historyScores.length > 0 ? (
              <div className="space-y-3">
                {historyScores.map((item) => (
                  <div
                    key={item.score_id}
                    className="p-4 rounded-2xl bg-[#102235] border border-[#27D9FF]/20 flex items-center justify-between hover:border-[#27D9FF]/50 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#27D9FF]/10 border border-[#27D9FF]/30 flex items-center justify-center text-[#27D9FF]">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white">Score Record #{item.score_id.slice(0, 8)}</h4>
                        <p className="text-xs text-[#B8C5D0]">
                          Calculated: {new Date(item.calculated_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <span className="text-xs text-[#B8C5D0] block">Score Band</span>
                        <span className="text-base font-extrabold text-[#27D9FF] font-mono">
                          {item.score_value} / 100 ({item.score_band})
                        </span>
                      </div>
                      <button
                        onClick={() => scoreZeroAPI.reports.downloadReportPdf(item.score_id)}
                        className="p-2 rounded-xl bg-[#081421] border border-[#27D9FF]/30 text-[#27D9FF] hover:bg-[#27D9FF]/10 transition-all"
                        title="Download PDF Report"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 rounded-2xl bg-[#102235] border border-[#27D9FF]/20 text-center text-xs text-[#B8C5D0]">
                No score records found yet. Upload a statement PDF to get scored.
              </div>
            )}
          </div>
        )}

        {/* TAB 3: ACCOUNT SETTINGS */}
        {activeTab === 'account' && user && (
          <div className="space-y-6 animate-fadeIn max-w-xl mx-auto">
            <div className="p-6 rounded-3xl bg-[#102235] border border-[#27D9FF]/30 space-y-4">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-[#27D9FF]" />
                <span>Account Overview</span>
              </h3>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between p-3 rounded-xl bg-[#081421]">
                  <span className="text-[#B8C5D0]">Name:</span>
                  <span className="font-bold text-white">{user.name}</span>
                </div>
                <div className="flex justify-between p-3 rounded-xl bg-[#081421]">
                  <span className="text-[#B8C5D0]">Email:</span>
                  <span className="font-bold text-white">{user.email}</span>
                </div>
                <div className="flex justify-between p-3 rounded-xl bg-[#081421]">
                  <span className="text-[#B8C5D0]">Email Status:</span>
                  <span className={user.email_verified ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                    {user.email_verified ? 'Verified ✓' : 'Pending Verification'}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-3xl bg-rose-950/20 border border-rose-500/30 space-y-4">
              <h4 className="text-base font-bold text-rose-400 flex items-center gap-2">
                <Trash2 className="w-5 h-5" />
                <span>Danger Zone</span>
              </h4>
              <p className="text-xs text-[#B8C5D0]">
                Permanently delete your user account and cascade delete all associated statement uploads, score history, and recommendations.
              </p>

              {!showDeleteConfirm ? (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-4 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-bold transition-all"
                >
                  Delete Account & All Data
                </button>
              ) : (
                <div className="p-4 rounded-2xl bg-rose-950/60 border border-rose-500/60 space-y-3">
                  <p className="text-xs font-bold text-rose-200">
                    Are you absolute sure? This action cannot be undone.
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={handleDeleteAccount}
                      className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-500"
                    >
                      Yes, Delete Everything
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="mt-16 py-6 text-center text-xs text-[#B8C5D0] border-t border-[#27D9FF]/15 w-full max-w-5xl flex flex-col sm:flex-row items-center justify-between gap-2">
        <p>ScoreZero — PhonePe & Google Pay AI Credit Scoring System</p>
        <p className="font-mono">Flask Backend (localhost:5000) + AI Recommendation Cascade</p>
      </footer>
    </div>
  );
}

export default BankStatementAnalyzerDashboard;
