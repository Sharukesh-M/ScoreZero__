import React from 'react';
import type { ScoreMetrics } from '../../api/client';
import { Calendar, DollarSign, ShieldAlert, TrendingUp, Zap } from 'lucide-react';

interface BreakdownPanelProps {
  metrics: ScoreMetrics;
  lowConfidence?: boolean;
}

export const BreakdownPanel: React.FC<BreakdownPanelProps> = ({ metrics, lowConfidence }) => {
  const getSubScoreBadge = (score: number) => {
    if (score >= 80) return { label: 'Excellent', class: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30' };
    if (score >= 60) return { label: 'Good', class: 'text-[#27D9FF] bg-[#27D9FF]/15 border-[#27D9FF]/30' };
    if (score >= 40) return { label: 'Fair', class: 'text-amber-400 bg-amber-500/15 border-amber-500/30' };
    return { label: 'Suboptimal', class: 'text-rose-400 bg-rose-500/15 border-rose-500/30' };
  };

  const items = [
    {
      title: 'Income Regularity',
      weight: '30%',
      score: metrics.income_regularity,
      icon: Calendar,
      desc: 'Evaluates the consistency and frequency of incoming salary/deposit credits over time.',
    },
    {
      title: 'Savings Ratio',
      weight: '25%',
      score: metrics.savings_ratio,
      icon: DollarSign,
      desc: 'Measures net cashflow retention ((Income - Expenses) / Income) across statement period.',
    },
    {
      title: 'Spending Discipline',
      weight: '20%',
      score: metrics.spending_discipline,
      icon: Zap,
      desc: 'Calculates discretionary spend vs essential obligations to gauge financial restraint.',
    },
    {
      title: 'Bounce Frequency',
      weight: '15%',
      score: metrics.bounce_frequency,
      icon: ShieldAlert,
      desc: 'Monitors transaction returns, NSF charges, and failed payment penalty counts.',
    },
    {
      title: 'Balance Trend',
      weight: '10%',
      score: metrics.balance_trend,
      icon: TrendingUp,
      desc: 'Tracks net account balance trajectory and positive liquidity buffers.',
    },
  ];

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            5-Factor Score Breakdown
          </h3>
          <p className="text-xs sm:text-sm text-[#B8C5D0]">
            Weighted behavioral credit assessment computed directly from statement transactions.
          </p>
        </div>
        {lowConfidence && (
          <div className="px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-xs font-mono font-bold text-amber-300 flex items-center gap-1.5">
            <span>⚠️ Low Confidence Extraction</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {items.map((item, idx) => {
          const Icon = item.icon;
          const badge = getSubScoreBadge(item.score);
          return (
            <div
              key={idx}
              className="bg-[#102235] border border-[#27D9FF]/20 rounded-2xl p-6 flex flex-col justify-between hover:border-[#27D9FF]/50 transition-all duration-300 shadow-md group"
            >
              <div>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#27D9FF]/10 border border-[#27D9FF]/30 flex items-center justify-center text-[#27D9FF] group-hover:scale-110 transition-transform">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-base flex items-center gap-2">
                        <span>{item.title}</span>
                        <span className="text-[10px] font-mono text-[#27D9FF] px-2 py-0.5 rounded-full bg-[#27D9FF]/10 border border-[#27D9FF]/20">
                          {item.weight}
                        </span>
                      </h4>
                      <p className="text-xs text-[#B8C5D0] mt-0.5 leading-relaxed">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="space-y-1.5 mt-2">
                  <div className="flex justify-between items-center text-xs font-mono">
                    <span className="text-[#B8C5D0]">Sub-Metric Score:</span>
                    <span className="font-extrabold text-white text-sm">
                      {item.score} <span className="text-[#B8C5D0] text-xs font-normal">/ 100</span>
                    </span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-[#081421] border border-[#27D9FF]/20 overflow-hidden p-0.5">
                    <div
                      className="h-full rounded-full transition-all duration-700 ease-out"
                      style={{
                        width: `${item.score}%`,
                        backgroundColor:
                          item.score >= 80
                            ? '#10B981'
                            : item.score >= 60
                            ? '#27D9FF'
                            : item.score >= 40
                            ? '#F59E0B'
                            : '#EF4444',
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-[#27D9FF]/10 flex items-center justify-between">
                <span className="text-[11px] text-[#B8C5D0]">Rating Status</span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold border ${badge.class}`}>
                  {badge.label} ({item.score})
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default BreakdownPanel;
