import { useEffect, useState } from 'react';

interface LoadingScreenProps {
  onComplete?: () => void;
}

export function LoadingScreen({ onComplete }: LoadingScreenProps) {
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<'loading' | 'done'>('loading');
  const [dots, setDots] = useState('');

  useEffect(() => {
    // Animate dots
    const dotsInterval = setInterval(() => {
      setDots(d => (d.length >= 3 ? '' : d + '.'));
    }, 400);

    // Animate progress bar
    const duration = 2200;
    const start = Date.now();
    const frame = () => {
      const elapsed = Date.now() - start;
      const raw = Math.min(elapsed / duration, 1);
      // ease-out
      const eased = 1 - Math.pow(1 - raw, 3);
      setProgress(Math.round(eased * 100));
      if (raw < 1) requestAnimationFrame(frame);
      else {
        setPhase('done');
        setTimeout(() => onComplete?.(), 350);
      }
    };
    requestAnimationFrame(frame);

    return () => clearInterval(dotsInterval);
  }, [onComplete]);

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#08101C]"
      style={{
        opacity: phase === 'done' ? 0 : 1,
        transition: 'opacity 0.35s ease-out',
        pointerEvents: phase === 'done' ? 'none' : 'auto',
      }}
    >
      {/* Animated background particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(18)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-[#00D2FF]"
            style={{
              width: `${2 + (i % 4)}px`,
              height: `${2 + (i % 4)}px`,
              left: `${(i * 17 + 5) % 95}%`,
              top: `${(i * 23 + 10) % 90}%`,
              opacity: 0.08 + (i % 5) * 0.05,
              animation: `floatParticle ${4 + (i % 4)}s ease-in-out infinite`,
              animationDelay: `${(i * 0.3) % 3}s`,
            }}
          />
        ))}
      </div>

      {/* Glow backdrop */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 60% 40% at 50% 50%, rgba(0,210,255,0.07) 0%, transparent 70%)',
        }}
      />

      {/* Central content */}
      <div className="relative flex flex-col items-center gap-8">
        {/* Logo + spinner ring */}
        <div className="relative w-28 h-28 flex items-center justify-center">
          {/* Outer spinning ring */}
          <svg
            className="absolute inset-0 w-full h-full"
            viewBox="0 0 112 112"
            style={{ animation: 'spinRing 1.8s linear infinite' }}
          >
            <circle
              cx="56" cy="56" r="50"
              fill="none"
              stroke="url(#ringGrad)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray="80 235"
            />
            <defs>
              <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#00D2FF" stopOpacity="1" />
                <stop offset="100%" stopColor="#7000FF" stopOpacity="0.2" />
              </linearGradient>
            </defs>
          </svg>

          {/* Inner slower counter-ring */}
          <svg
            className="absolute inset-0 w-full h-full"
            viewBox="0 0 112 112"
            style={{ animation: 'spinRingReverse 3s linear infinite' }}
          >
            <circle
              cx="56" cy="56" r="42"
              fill="none"
              stroke="rgba(0,210,255,0.15)"
              strokeWidth="1"
              strokeDasharray="30 236"
              strokeLinecap="round"
            />
          </svg>

          {/* Logo icon */}
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#00D2FF] to-[#0a1628] p-[1.5px]">
            <div
              className="w-full h-full bg-[#08101C] rounded-2xl flex items-center justify-center"
              style={{ animation: 'pulseLogo 2s ease-in-out infinite' }}
            >
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <path
                  d="M16 4L28 10V22L16 28L4 22V10L16 4Z"
                  stroke="#00D2FF"
                  strokeWidth="1.5"
                  fill="none"
                  opacity="0.4"
                />
                <path
                  d="M16 8L24 12.5V21.5L16 26L8 21.5V12.5L16 8Z"
                  fill="rgba(0,210,255,0.12)"
                  stroke="#00D2FF"
                  strokeWidth="1"
                />
                <circle cx="16" cy="16" r="3.5" fill="#00D2FF" />
                <line x1="16" y1="12.5" x2="16" y2="8" stroke="#00D2FF" strokeWidth="1" opacity="0.7" />
                <line x1="16" y1="19.5" x2="16" y2="24" stroke="#00D2FF" strokeWidth="1" opacity="0.7" />
                <line x1="19.1" y1="14.25" x2="23.1" y2="11.75" stroke="#00D2FF" strokeWidth="1" opacity="0.7" />
                <line x1="12.9" y1="17.75" x2="8.9" y2="20.25" stroke="#00D2FF" strokeWidth="1" opacity="0.7" />
              </svg>
            </div>
          </div>
        </div>

        {/* Brand name */}
        <div className="text-center">
          <h1 className="text-3xl font-black tracking-tight text-white">
            Score<span className="text-[#00D2FF]">Zero</span>
          </h1>
          <p className="mt-1 text-xs font-medium text-slate-500 tracking-widest uppercase">
            AI Credit Intelligence Engine
          </p>
        </div>

        {/* Progress bar */}
        <div className="w-64 flex flex-col gap-2">
          <div className="w-full h-[3px] bg-slate-800/80 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${progress}%`,
                background: 'linear-gradient(90deg, #00D2FF, #7000FF)',
                boxShadow: '0 0 12px rgba(0,210,255,0.6)',
                transition: 'width 0.05s linear',
              }}
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-600 font-mono uppercase tracking-widest">
              Initializing{dots}
            </span>
            <span className="text-[10px] text-[#00D2FF] font-mono font-bold">
              {progress}%
            </span>
          </div>
        </div>

        {/* Status chips */}
        <div className="flex items-center gap-3">
          {[
            { label: 'Auth', delay: 0 },
            { label: 'Engine', delay: 0.4 },
            { label: 'AI Ready', delay: 0.8 },
          ].map((chip) => (
            <div
              key={chip.label}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#0d1f2d] border border-slate-700/50"
              style={{ animation: `fadeInChip 0.5s ease-out forwards`, animationDelay: `${chip.delay}s`, opacity: 0 }}
            >
              <div
                className="w-1.5 h-1.5 rounded-full bg-[#00D2FF]"
                style={{ animation: 'chipPulse 1.5s ease-in-out infinite', animationDelay: `${chip.delay}s` }}
              />
              <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest">{chip.label}</span>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes spinRing {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes spinRingReverse {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }
        @keyframes pulseLogo {
          0%, 100% { box-shadow: 0 0 0 0 rgba(0,210,255,0); }
          50% { box-shadow: 0 0 20px 4px rgba(0,210,255,0.25); }
        }
        @keyframes floatParticle {
          0%, 100% { transform: translateY(0px) scale(1); opacity: 0.08; }
          50% { transform: translateY(-14px) scale(1.2); opacity: 0.18; }
        }
        @keyframes fadeInChip {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes chipPulse {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.3); }
        }
      `}</style>
    </div>
  );
}
