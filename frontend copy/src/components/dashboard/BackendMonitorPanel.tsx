import { useState, useEffect } from 'react';
import { Activity, Database, Cpu, ShieldCheck, Zap, RefreshCw, Terminal, Layers, Key } from 'lucide-react';
import scoreZeroAPI, { type User } from '../../api/client';
import { isSupabaseConfigured } from '../../lib/supabase';

interface BackendMonitorPanelProps {
  currentUser: User | null;
  backendStatus: 'checking' | 'online' | 'offline';
  onRecheckBackend: () => void;
}

export default function BackendMonitorPanel({
  currentUser,
  backendStatus,
  onRecheckBackend,
}: BackendMonitorPanelProps) {
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [apiEndpoints, setApiEndpoints] = useState<Record<string, string>>({});
  const [testLog, setTestLog] = useState<{ timestamp: string; method: string; endpoint: string; status: number | string; duration: number }[]>([]);
  const [testingEndpoint, setTestingEndpoint] = useState<string | null>(null);

  const measureLatency = async () => {
    const start = performance.now();
    try {
      const res = await scoreZeroAPI.checkHealth();
      const duration = Math.round(performance.now() - start);
      setLatencyMs(duration);
      if (res.endpoints) {
        setApiEndpoints(res.endpoints);
      }
      return { success: true, duration };
    } catch {
      setLatencyMs(null);
      return { success: false, duration: Math.round(performance.now() - start) };
    }
  };

  useEffect(() => {
    measureLatency();
  }, []);

  const runTest = async (name: string, apiCall: () => Promise<any>, method: string, endpoint: string) => {
    setTestingEndpoint(name);
    const start = performance.now();
    const now = new Date().toLocaleTimeString();
    try {
      await apiCall();
      const duration = Math.round(performance.now() - start);
      setTestLog((prev) => [
        { timestamp: now, method, endpoint, status: '200 OK', duration },
        ...prev.slice(0, 9),
      ]);
    } catch (err: any) {
      const duration = Math.round(performance.now() - start);
      setTestLog((prev) => [
        { timestamp: now, method, endpoint, status: err.message || 'Error', duration },
        ...prev.slice(0, 9),
      ]);
    } finally {
      setTestingEndpoint(null);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Overview Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Flask Server Status */}
        <div className="p-5 rounded-3xl bg-[#102235] border border-[#27D9FF]/25 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-[#27D9FF] uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4" />
              <span>Flask API Engine</span>
            </span>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                backendStatus === 'online'
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
              }`}
            >
              {backendStatus === 'online' ? 'ONLINE' : 'OFFLINE'}
            </span>
          </div>

          <div className="flex items-baseline justify-between pt-1">
            <span className="text-2xl font-black font-mono text-white">
              {latencyMs !== null ? `${latencyMs}ms` : '---'}
            </span>
            <span className="text-xs font-mono text-slate-400">Response Latency</span>
          </div>

          <div className="flex items-center justify-between text-xs text-[#B8C5D0] pt-1 border-t border-slate-800">
            <span>Registered Routes:</span>
            <code className="text-[11px] text-[#27D9FF] font-mono">
              {Object.keys(apiEndpoints).length > 0 ? `${Object.keys(apiEndpoints).length} active routes` : 'http://localhost:5000/api'}
            </code>
          </div>
        </div>

        {/* Supabase & Database Status */}
        <div className="p-5 rounded-3xl bg-[#102235] border border-[#27D9FF]/25 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-[#27D9FF] uppercase tracking-wider flex items-center gap-2">
              <Database className="w-4 h-4" />
              <span>Supabase & Postgres</span>
            </span>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                isSupabaseConfigured
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
              }`}
            >
              {isSupabaseConfigured ? 'CONNECTED' : 'LOCAL MOCK'}
            </span>
          </div>

          <div className="flex items-baseline justify-between pt-1">
            <span className="text-base font-bold text-white font-mono truncate max-w-[180px]">
              {currentUser ? currentUser.email : 'Guest Session'}
            </span>
            <span className="text-xs font-mono text-slate-400">Active User</span>
          </div>

          <div className="flex items-center justify-between text-xs text-[#B8C5D0] pt-1 border-t border-slate-800">
            <span>Tables:</span>
            <span className="text-[11px] text-emerald-400 font-mono font-bold">users, uploads, scores, recs</span>
          </div>
        </div>

        {/* AI Scoring Pipeline */}
        <div className="p-5 rounded-3xl bg-[#102235] border border-[#27D9FF]/25 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-[#27D9FF] uppercase tracking-wider flex items-center gap-2">
              <Cpu className="w-4 h-4" />
              <span>AI Coaching Cascade</span>
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
              OLLAMA + GEMINI
            </span>
          </div>

          <div className="flex items-baseline justify-between pt-1">
            <span className="text-base font-bold text-white font-mono">llama3.2</span>
            <span className="text-xs font-mono text-slate-400">Local Model</span>
          </div>

          <div className="flex items-center justify-between text-xs text-[#B8C5D0] pt-1 border-t border-slate-800">
            <span>Timeout Budget:</span>
            <span className="text-[11px] text-cyan-300 font-mono font-bold">8.0 Seconds</span>
          </div>
        </div>
      </div>

      {/* Interactive API Tester & Route Inspector */}
      <div className="p-6 rounded-3xl bg-[#102235] border border-[#27D9FF]/20 space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Terminal className="w-5 h-5 text-[#27D9FF]" />
            <span>Backend to Frontend API Integration Inspector</span>
          </h3>
          <button
            onClick={() => {
              onRecheckBackend();
              measureLatency();
            }}
            className="px-3.5 py-1.5 rounded-xl bg-[#081421] hover:bg-[#27D9FF]/10 text-[#27D9FF] border border-[#27D9FF]/30 text-xs font-bold transition-all flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Ping Backend</span>
          </button>
        </div>

        {/* API Action Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button
            onClick={() => runTest('health', () => scoreZeroAPI.checkHealth(), 'GET', '/api/health')}
            disabled={testingEndpoint === 'health'}
            className="p-3 rounded-2xl bg-[#081421] border border-[#27D9FF]/30 hover:border-[#27D9FF] text-left transition-all group"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-mono font-bold text-emerald-400">GET</span>
              <Zap className="w-3.5 h-3.5 text-[#27D9FF] group-hover:scale-110 transition-transform" />
            </div>
            <span className="text-xs font-bold text-white block">/api/health</span>
            <span className="text-[10px] text-[#B8C5D0]">Ping Engine</span>
          </button>

          <button
            onClick={() => runTest('me', () => scoreZeroAPI.auth.getMe(), 'GET', '/api/auth/me')}
            disabled={testingEndpoint === 'me'}
            className="p-3 rounded-2xl bg-[#081421] border border-[#27D9FF]/30 hover:border-[#27D9FF] text-left transition-all group"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-mono font-bold text-emerald-400">GET</span>
              <ShieldCheck className="w-3.5 h-3.5 text-[#27D9FF] group-hover:scale-110 transition-transform" />
            </div>
            <span className="text-xs font-bold text-white block">/api/auth/me</span>
            <span className="text-[10px] text-[#B8C5D0]">Verify JWT Session</span>
          </button>

          <button
            onClick={() => runTest('scores', () => scoreZeroAPI.scores.list(), 'GET', '/api/scores')}
            disabled={testingEndpoint === 'scores'}
            className="p-3 rounded-2xl bg-[#081421] border border-[#27D9FF]/30 hover:border-[#27D9FF] text-left transition-all group"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-mono font-bold text-emerald-400">GET</span>
              <Layers className="w-3.5 h-3.5 text-[#27D9FF] group-hover:scale-110 transition-transform" />
            </div>
            <span className="text-xs font-bold text-white block">/api/scores</span>
            <span className="text-[10px] text-[#B8C5D0]">Fetch Score Records</span>
          </button>

          <button
            onClick={() => runTest('uploads', () => scoreZeroAPI.uploads.list(), 'GET', '/api/uploads')}
            disabled={testingEndpoint === 'uploads'}
            className="p-3 rounded-2xl bg-[#081421] border border-[#27D9FF]/30 hover:border-[#27D9FF] text-left transition-all group"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-mono font-bold text-emerald-400">GET</span>
              <Key className="w-3.5 h-3.5 text-[#27D9FF] group-hover:scale-110 transition-transform" />
            </div>
            <span className="text-xs font-bold text-white block">/api/uploads</span>
            <span className="text-[10px] text-[#B8C5D0]">List User Uploads</span>
          </button>
        </div>

        {/* Live Call Log Console */}
        <div className="bg-[#081421] border border-[#27D9FF]/20 rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
              Live Network Execution Log
            </span>
            <span className="text-[10px] font-mono text-[#27D9FF]">
              {testLog.length} calls logged
            </span>
          </div>

          {testLog.length > 0 ? (
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {testLog.map((log, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 rounded-lg bg-[#102235]/60 text-xs font-mono"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-500">{log.timestamp}</span>
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                      {log.method}
                    </span>
                    <span className="text-white font-bold">{log.endpoint}</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-cyan-400 font-bold">{log.duration}ms</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        String(log.status).includes('200') || String(log.status).includes('OK')
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-rose-500/20 text-rose-300'
                      }`}
                    >
                      {log.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-6 text-center text-xs font-mono text-slate-500">
              Click any API test button above to execute live request to Flask backend (http://localhost:5000).
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
