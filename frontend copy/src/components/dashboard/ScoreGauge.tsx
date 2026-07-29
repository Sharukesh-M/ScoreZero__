import React from 'react';
import { ShieldCheck, Award } from 'lucide-react';

interface ScoreGaugeProps {
  score: number;
  totalTransactions: number;
  privacyNotice: string;
}

export const ScoreGauge: React.FC<ScoreGaugeProps> = ({
  score,
  totalTransactions,
  privacyNotice,
}) => {
  const clampedScore = Math.max(0, Math.min(100, Math.round(score)));

  const radius = 90;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (clampedScore / 100) * (circumference * 0.75);

  const getScoreBand = (val: number) => {
    if (val >= 80) return { label: 'Excellent Financial Health', color: '#10B981', glow: 'rgba(16,185,129,0.3)', badge: 'Prime Tier' };
    if (val >= 65) return { label: 'Good Financial Health', color: '#27D9FF', glow: 'rgba(39,217,255,0.3)', badge: 'Qualified' };
    if (val >= 50) return { label: 'Fair Financial Health', color: '#F59E0B', glow: 'rgba(245,158,11,0.3)', badge: 'Moderate' };
    return { label: 'Needs Attention', color: '#EF4444', glow: 'rgba(239,68,68,0.3)', badge: 'Suboptimal' };
  };

  const band = getScoreBand(clampedScore);

  return (
    <div className="w-full bg-[#102235] border border-[#27D9FF]/30 rounded-3xl p-6 sm:p-8 flex flex-col items-center justify-between text-center relative overflow-hidden shadow-[0_0_50px_rgba(39,217,255,0.15)]">
      <div className="px-4 py-1 rounded-full text-xs font-mono font-bold text-[#27D9FF] bg-[#27D9FF]/10 border border-[#27D9FF]/20 uppercase tracking-widest mb-6">
        Financial Health Score (0 – 100)
      </div>

      <div className="relative w-64 h-64 flex items-center justify-center mb-6">
        <div className="w-full h-full rounded-full bg-[#081421] border border-[#27D9FF]/20 p-4 flex items-center justify-center relative shadow-inner">
          <svg className="w-full h-full transform -rotate-135" viewBox="0 0 220 220">
            <circle
              cx="110"
              cy="110"
              r={radius}
              stroke="#0D1F32"
              strokeWidth="18"
              fill="transparent"
              strokeDasharray={`${circumference * 0.75} ${circumference * 0.25}`}
              strokeLinecap="round"
            />
            <circle
              cx="110"
              cy="110"
              r={radius}
              stroke={band.color}
              strokeWidth="18"
              fill="transparent"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="transition-all duration-1000 ease-out"
              style={{ filter: `drop-shadow(0 0 8px ${band.color})` }}
            />
          </svg>

          <div className="absolute inset-8 bg-[#102235] rounded-full border border-[#27D9FF]/20 flex flex-col items-center justify-center p-4 shadow-lg">
            <span className="text-5xl sm:text-6xl font-black text-white tracking-tight">
              {clampedScore}
            </span>
            <span className="text-[10px] font-bold text-[#B8C5D0] uppercase tracking-widest mt-1 font-mono">
              Score / 100
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-2 mb-6">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#081421] border border-[#27D9FF]/30 text-sm font-bold text-white shadow-md">
          <Award className="w-4 h-4 text-[#27D9FF]" />
          <span>{band.label}</span>
          <span className="text-xs px-2 py-0.5 rounded-full text-[#081421] font-extrabold" style={{ backgroundColor: band.color }}>
            {band.badge}
          </span>
        </div>
        <p className="text-xs text-[#B8C5D0] max-w-xs font-medium">
          Calculated deterministically from {totalTransactions} UPI transactions in your statement export.
        </p>
      </div>

      <div className="w-full p-3.5 rounded-2xl bg-[#081421] border border-[#27D9FF]/20 text-left flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-[#27D9FF] shrink-0 mt-0.5" />
        <p className="text-xs text-[#B8C5D0] font-medium leading-relaxed">
          {privacyNotice}
        </p>
      </div>
    </div>
  );
};

export default ScoreGauge;
