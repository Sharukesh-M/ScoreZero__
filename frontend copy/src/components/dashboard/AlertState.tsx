import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface AlertStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export const AlertState: React.FC<AlertStateProps> = ({
  title = 'Statement Processing Alert',
  message,
  onRetry,
}) => {
  return (
    <div className="w-full max-w-xl mx-auto bg-[#102235] border border-rose-500/30 rounded-3xl p-6 sm:p-8 my-8 text-center space-y-6 shadow-[0_0_40px_rgba(244,63,94,0.15)]">
      <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 mx-auto flex items-center justify-center text-rose-400">
        <AlertTriangle className="w-8 h-8" />
      </div>

      <div className="space-y-2">
        <h3 className="text-xl font-bold text-white">
          {title}
        </h3>
        <p className="text-sm text-[#B8C5D0] max-w-md mx-auto leading-relaxed">
          {message}
        </p>
      </div>

      <div className="p-4 rounded-2xl bg-[#081421] border border-[#27D9FF]/20 text-left text-xs text-[#B8C5D0] space-y-1.5">
        <span className="font-bold text-white block">Requirements Check:</span>
        <ul className="list-disc list-inside space-y-1">
          <li>Must be an official PDF export directly from PhonePe or Google Pay.</li>
          <li>Remove any PDF password encryption before uploading.</li>
          <li>Bank passbooks, Paytm exports, and scanned image PDFs are not supported.</li>
        </ul>
      </div>

      {onRetry && (
        <button
          onClick={onRetry}
          className="px-6 py-3 rounded-xl bg-[#27D9FF] text-[#081421] font-bold text-xs hover:bg-[#4BE7FF] transition-all shadow-lg flex items-center justify-center gap-2 mx-auto"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Try Another File</span>
        </button>
      )}
    </div>
  );
};

export default AlertState;
