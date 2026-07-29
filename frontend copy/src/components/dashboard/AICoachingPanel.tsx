import React from 'react';
import type { RecommendationItem } from '../../api/client';
import { Sparkles, CheckCircle2, Bot } from 'lucide-react';

interface AICoachingPanelProps {
  recommendations: RecommendationItem[];
  isLoading?: boolean;
}

export const AICoachingPanel: React.FC<AICoachingPanelProps> = ({
  recommendations,
  isLoading,
}) => {
  return (
    <div className="w-full space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#27D9FF]/10 border border-[#27D9FF]/30 flex items-center justify-center text-[#27D9FF]">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              AI Financial Coaching & Action Plan
            </h3>
            <p className="text-xs sm:text-sm text-[#B8C5D0]">
              Actionable guidance tailored to improve your weakest financial metrics.
            </p>
          </div>
        </div>

        <div className="px-3 py-1 rounded-full bg-[#102235] border border-[#27D9FF]/30 text-xs font-mono font-bold text-[#27D9FF] flex items-center gap-1.5 shrink-0">
          <Bot className="w-4 h-4" />
          <span>Cascade Engine</span>
        </div>
      </div>

      {isLoading ? (
        <div className="p-8 rounded-3xl bg-[#102235] border border-[#27D9FF]/20 text-center space-y-3 animate-pulse">
          <div className="flex items-center justify-center gap-2">
            <div className="w-5 h-5 rounded-full border-2 border-[#27D9FF]/30 border-t-[#27D9FF] animate-spin" />
            <span className="text-sm font-bold text-[#27D9FF]">
              Generating AI Financial Recommendations (Ollama / Gemini)...
            </span>
          </div>
        </div>
      ) : recommendations.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {recommendations.map((rec, idx) => (
            <div
              key={rec.id || idx}
              className="bg-[#102235] border border-[#27D9FF]/20 rounded-2xl p-6 flex flex-col justify-between hover:border-[#27D9FF]/50 transition-all duration-300 shadow-md group"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-xl bg-[#27D9FF]/10 border border-[#27D9FF]/30 flex items-center justify-center text-[#27D9FF] font-mono font-bold text-xs">
                    0{idx + 1}
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">
                    {rec.ai_generated ? 'AI Generated' : 'Rule-Based'}
                  </span>
                </div>

                <p className="text-sm font-medium text-white leading-relaxed">
                  "{rec.text}"
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-[#27D9FF]/10 flex items-center gap-2 text-xs text-[#B8C5D0]">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="font-semibold text-white">Recommended Action</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-6 rounded-2xl bg-[#102235] border border-[#27D9FF]/20 text-center text-xs text-[#B8C5D0]">
          No AI recommendations generated yet. Calculate a score to view insights.
        </div>
      )}
    </div>
  );
};

export default AICoachingPanel;
