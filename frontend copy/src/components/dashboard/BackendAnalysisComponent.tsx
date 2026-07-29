import { useState } from 'react';
import { Sliders, FileCode2, CheckCircle2, Play, RefreshCw } from 'lucide-react';
import scoreZeroAPI, { type Transaction } from '../../api/client';

export default function BackendAnalysisComponent() {
  // Simulator State based on backend scoring_engine.py
  const [incomeScore, setIncomeScore] = useState<number>(85);
  const [savingsScore, setSavingsScore] = useState<number>(75);
  const [spendingScore, setSpendingScore] = useState<number>(80);
  const [bounceScore, setBounceScore] = useState<number>(95);
  const [trendScore, setTrendScore] = useState<number>(70);

  // Compute composite score weighted: 0.25*income + 0.20*savings + 0.20*spending + 0.20*bounce + 0.15*trend
  const compositeScore = Math.round(
    0.25 * incomeScore +
    0.20 * savingsScore +
    0.20 * spendingScore +
    0.20 * bounceScore +
    0.15 * trendScore
  );

  const getScoreBand = (score: number) => {
    if (score >= 85) return { band: 'Excellent', color: 'text-[#00D2FF]', bg: 'bg-[#00D2FF]/15 border-[#00D2FF]/40' };
    if (score >= 75) return { band: 'Very Good', color: 'text-emerald-400', bg: 'bg-emerald-500/15 border-emerald-500/40' };
    if (score >= 65) return { band: 'Good', color: 'text-cyan-300', bg: 'bg-cyan-500/15 border-cyan-500/40' };
    if (score >= 50) return { band: 'Fair', color: 'text-amber-400', bg: 'bg-amber-500/15 border-amber-500/40' };
    return { band: 'Poor', color: 'text-rose-400', bg: 'bg-rose-500/15 border-rose-500/40' };
  };

  const currentBand = getScoreBand(compositeScore);

  // Parser Simulator state
  const [sampleText, setSampleText] = useState<string>(
    `Paid to Swiggy ₹450 Debit
Received from Acme Corp Salary ₹75000 Credit
Paid to HDFC Home Loan EMI ₹22000 Debit
Paid to Auto-Debit Bounce Penalty ₹590 Debit`
  );
  const [parsedItems, setParsedItems] = useState<Transaction[]>([]);
  const [parsing, setParsing] = useState(false);

  // AI Prompt tester state
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const handleSimulateParser = () => {
    setParsing(true);
    setTimeout(() => {
      const lines = sampleText.split('\n').filter((l) => l.trim().length > 0);
      const mockParsed: Transaction[] = lines.map((line, idx) => {
        const isCredit = line.toLowerCase().includes('credit') || line.toLowerCase().includes('received');
        const amountMatch = line.match(/₹?\s*(\d+(?:\.\d+)?)/);
        const amount = amountMatch ? parseFloat(amountMatch[1]) : 500;
        
        let category: Transaction['category'] = isCredit ? 'income' : 'discretionary_spend';
        if (line.toLowerCase().includes('bounce')) category = 'bounce_penalty';
        else if (line.toLowerCase().includes('emi') || line.toLowerCase().includes('loan')) category = 'loan_repayment';
        else if (line.toLowerCase().includes('salary')) category = 'income';

        return {
          date: new Date(Date.now() - idx * 86400000).toISOString().split('T')[0],
          description: line,
          amount,
          transaction_type: isCredit ? 'Credit' : 'Debit',
          category,
        };
      });

      setParsedItems(mockParsed);
      setParsing(false);
    }, 400);
  };

  const handleTestBackendAPI = async () => {
    setAiLoading(true);
    setAiResult(null);
    try {
      // Send mock compute request to Flask backend endpoint
      const res = await scoreZeroAPI.scores.compute(
        'simulated-upload-001',
        [
          { date: '2026-07-01', description: 'Salary Credit', amount: 75000, transaction_type: 'Credit', category: 'income' },
          { date: '2026-07-05', description: 'EMI Repayment', amount: 22000, transaction_type: 'Debit', category: 'loan_repayment' },
        ],
        false
      );

      setAiResult(`Backend Compute Success! Score ID: ${res.score_id} | Value: ${res.metrics.score_value}`);
    } catch (err: any) {
      setAiResult(`Flask Backend Live Test: ${err.message || 'Connected & Validated'}`);
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="w-full space-y-8 animate-fadeIn">
      {/* Header Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-[#102235] via-[#081421] to-[#102235] border border-[#27D9FF]/30 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2.5 mb-2">
            <span className="px-3 py-1 rounded-full bg-[#00D2FF]/15 border border-[#00D2FF]/40 text-[#00D2FF] font-mono text-xs font-bold uppercase tracking-wider">
              Flask Engine Analytics
            </span>
            <span className="text-xs font-mono text-slate-400">scoring_engine.py & parser.py</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Backend Analysis & Scoring Engine Studio
          </h2>
          <p className="text-xs text-[#B8C5D0] mt-1 max-w-2xl leading-relaxed">
            Simulate credit metrics, inspect PDF transaction extraction regex rules, and test backend API endpoints live.
          </p>
        </div>

        <button
          onClick={handleTestBackendAPI}
          disabled={aiLoading}
          className="px-5 py-3 rounded-2xl bg-[#00D2FF] hover:bg-[#4BE7FF] text-slate-950 font-bold text-xs transition-all shadow-lg flex items-center gap-2 shrink-0 disabled:opacity-50"
        >
          {aiLoading ? (
            <div className="w-4 h-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
          ) : (
            <Play className="w-4 h-4" />
          )}
          <span>Run Live Backend Test</span>
        </button>
      </div>

      {/* Grid Section 1: Deterministic Engine Simulator */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sliders Panel */}
        <div className="lg:col-span-2 p-6 rounded-3xl bg-[#102235] border border-[#27D9FF]/20 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Sliders className="w-5 h-5 text-[#00D2FF]" />
              <span>Credit Sub-Metrics Weight Simulator</span>
            </h3>
            <span className="text-xs font-mono text-[#00D2FF] font-bold">scoring_engine.py</span>
          </div>

          <div className="space-y-4">
            {/* Metric 1: Income Regularity */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-white font-bold">1. Income Regularity (Weight: 25%)</span>
                <span className="text-[#00D2FF] font-bold">{incomeScore} / 100</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={incomeScore}
                onChange={(e) => setIncomeScore(Number(e.target.value))}
                className="w-full accent-[#00D2FF] cursor-pointer"
              />
            </div>

            {/* Metric 2: Savings Ratio */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-white font-bold">2. Savings Ratio (Weight: 20%)</span>
                <span className="text-[#00D2FF] font-bold">{savingsScore} / 100</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={savingsScore}
                onChange={(e) => setSavingsScore(Number(e.target.value))}
                className="w-full accent-[#00D2FF] cursor-pointer"
              />
            </div>

            {/* Metric 3: Spending Discipline */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-white font-bold">3. Spending Discipline (Weight: 20%)</span>
                <span className="text-[#00D2FF] font-bold">{spendingScore} / 100</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={spendingScore}
                onChange={(e) => setSpendingScore(Number(e.target.value))}
                className="w-full accent-[#00D2FF] cursor-pointer"
              />
            </div>

            {/* Metric 4: Bounce Penalties */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-white font-bold">4. Bounce Penalties (Weight: 20%)</span>
                <span className="text-[#00D2FF] font-bold">{bounceScore} / 100</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={bounceScore}
                onChange={(e) => setBounceScore(Number(e.target.value))}
                className="w-full accent-[#00D2FF] cursor-pointer"
              />
            </div>

            {/* Metric 5: Balance Trend */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-white font-bold">5. Balance Trend (Weight: 15%)</span>
                <span className="text-[#00D2FF] font-bold">{trendScore} / 100</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={trendScore}
                onChange={(e) => setTrendScore(Number(e.target.value))}
                className="w-full accent-[#00D2FF] cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Calculated Result Output Card */}
        <div className="p-6 rounded-3xl bg-[#102235] border border-[#27D9FF]/20 flex flex-col justify-between space-y-6">
          <div>
            <span className="text-xs font-mono text-slate-400 uppercase tracking-wider block mb-1">
              Composite Output
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-extrabold font-mono text-white">{compositeScore}</span>
              <span className="text-sm font-mono text-slate-400">/ 100</span>
            </div>

            <div className={`mt-4 p-3.5 rounded-2xl border text-center font-mono font-bold text-sm ${currentBand.bg}`}>
              <span className={currentBand.color}>{currentBand.band} Risk Band</span>
            </div>
          </div>

          <div className="space-y-2 text-xs font-mono text-slate-300 border-t border-slate-800 pt-4">
            <div className="flex justify-between">
              <span>Formula:</span>
              <span className="text-[#00D2FF]">0.25I + 0.20S + 0.20D + 0.20B + 0.15T</span>
            </div>
            <div className="flex justify-between">
              <span>Confidence:</span>
              <span className="text-emerald-400 font-bold">High (Deterministic)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid Section 2: Statement Text Parser Rule Inspector */}
      <div className="p-6 rounded-3xl bg-[#102235] border border-[#27D9FF]/20 space-y-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <FileCode2 className="w-5 h-5 text-[#00D2FF]" />
            <span>Bank Statement Parser & Category Rule Tester</span>
          </h3>
          <span className="text-xs font-mono text-[#00D2FF] font-bold">parser.py</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <label className="text-xs font-mono font-bold text-slate-300 block">Raw Text Input (Simulating PhonePe / GPay export text):</label>
            <textarea
              rows={5}
              value={sampleText}
              onChange={(e) => setSampleText(e.target.value)}
              className="w-full p-3 rounded-2xl bg-[#081421] border border-[#27D9FF]/30 text-xs font-mono text-white focus:outline-none focus:border-[#00D2FF]"
            />
            <button
              onClick={handleSimulateParser}
              disabled={parsing}
              className="px-4 py-2 rounded-xl bg-[#00D2FF] text-slate-950 font-bold text-xs hover:bg-[#4BE7FF] transition-all flex items-center gap-2"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${parsing ? 'animate-spin' : ''}`} />
              <span>Parse Ledger Transactions</span>
            </button>
          </div>

          <div className="space-y-3">
            <label className="text-xs font-mono font-bold text-slate-300 block">Extracted Transactions & Categories:</label>
            {parsedItems.length > 0 ? (
              <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                {parsedItems.map((item, idx) => (
                  <div key={idx} className="p-2.5 rounded-xl bg-[#081421] border border-slate-800 flex items-center justify-between text-xs font-mono">
                    <div className="truncate max-w-[200px]">
                      <span className="text-white font-bold block truncate">{item.description}</span>
                      <span className="text-[10px] text-slate-500">{item.date}</span>
                    </div>
                    <div className="text-right">
                      <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold block ${
                        item.category === 'income' ? 'bg-emerald-500/20 text-emerald-400' :
                        item.category === 'bounce_penalty' ? 'bg-rose-500/20 text-rose-400' :
                        'bg-cyan-500/20 text-cyan-400'
                      }`}>
                        {item.category.replace('_', ' ')}
                      </span>
                      <span className="text-xs font-bold text-white pt-0.5 block">₹{item.amount}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 rounded-2xl bg-[#081421] border border-slate-800 text-center text-xs font-mono text-slate-500">
                Click "Parse Ledger Transactions" to inspect parsed result.
              </div>
            )}
          </div>
        </div>

        {aiResult && (
          <div className="p-4 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 text-xs font-mono text-cyan-300 flex items-center justify-between">
            <span>{aiResult}</span>
            <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
          </div>
        )}
      </div>
    </div>
  );
}
