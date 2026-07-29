import React from 'react';
import { Shield, Sparkles, RefreshCw, ArrowLeft } from 'lucide-react';

interface DashboardHeaderProps {
  onReset?: () => void;
  hasData?: boolean;
  onBackToLanding?: () => void;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({ onReset, hasData, onBackToLanding }) => {
  return (
    <header className="w-full py-5 px-6 rounded-3xl bg-[#102235]/80 backdrop-blur-xl border border-[#27D9FF]/20 flex flex-col md:flex-row items-center justify-between gap-4 shadow-[0_0_30px_rgba(39,217,255,0.15)] mb-8">
      <div className="flex items-center gap-4">
        {onBackToLanding && (
          <button
            onClick={onBackToLanding}
            className="p-2.5 rounded-xl bg-[#081421] border border-[#27D9FF]/30 text-[#27D9FF] hover:bg-[#27D9FF]/10 transition-all flex items-center gap-1.5 text-xs font-semibold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Landing</span>
          </button>
        )}
        <div className="w-11 h-11 rounded-2xl bg-[#27D9FF]/10 border border-[#27D9FF]/30 flex items-center justify-center text-[#27D9FF]">
          <Sparkles className="w-6 h-6" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              ScoreZero Statement Engine
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#27D9FF]/20 text-[#27D9FF] border border-[#27D9FF]/30">
              v1.0 FastAPI
            </span>
          </div>
          <p className="text-xs text-[#B8C5D0]">
            Privacy-first PhonePe & Google Pay UPI Bank Statement Scoring
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="px-3.5 py-2 rounded-xl bg-[#081421] border border-[#27D9FF]/20 flex items-center gap-2 text-xs text-[#B8C5D0]">
          <Shield className="w-4 h-4 text-[#27D9FF]" />
          <span>100% In-Memory Parsing</span>
        </div>

        {hasData && onReset && (
          <button
            onClick={onReset}
            className="px-4 py-2 rounded-xl bg-[#27D9FF] text-[#081421] font-bold text-xs hover:bg-[#4BE7FF] transition-all flex items-center gap-1.5 shadow-[0_0_15px_rgba(39,217,255,0.3)]"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>New Upload</span>
          </button>
        )}
      </div>
    </header>
  );
};

export default DashboardHeader;
