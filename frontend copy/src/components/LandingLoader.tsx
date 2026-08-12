import { useEffect, useState } from 'react';

interface LandingLoaderProps {
  isLoading?: boolean;
}

export function LandingLoader({ isLoading = false }: LandingLoaderProps) {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    // If hero assets are still loading, keep loader up until ready (or safety 4s cap)
    if (isLoading) {
      const safetyTimer = setTimeout(() => {
        setFading(true);
        setTimeout(() => setVisible(false), 500);
      }, 4000);
      return () => clearTimeout(safetyTimer);
    }

    // Graceful fade out once hero assets are loaded (min 600ms display)
    const fadeTimer = setTimeout(() => setFading(true), 600);
    const removeTimer = setTimeout(() => setVisible(false), 1100);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, [isLoading]);

  if (!visible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: '#08101C',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '20px',
        opacity: fading ? 0 : 1,
        transition: 'opacity 0.5s ease',
        pointerEvents: fading ? 'none' : 'auto',
      }}
    >
      {/* Animated ring */}
      <div style={{ position: 'relative', width: 72, height: 72 }}>
        {/* Outer glow ring */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            border: '2px solid rgba(0,210,255,0.15)',
          }}
        />
        {/* Spinning arc */}
        <svg
          width="72"
          height="72"
          viewBox="0 0 72 72"
          style={{ position: 'absolute', inset: 0, animation: 'sz-spin 1s linear infinite' }}
        >
          <circle
            cx="36"
            cy="36"
            r="30"
            fill="none"
            stroke="url(#sz-grad)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray="100 90"
          />
          <defs>
            <linearGradient id="sz-grad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#00D2FF" />
              <stop offset="100%" stopColor="#4facfe" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>

        {/* Center logo mark */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 2L3 7l9 5 9-5-9-5zM3 17l9 5 9-5M3 12l9 5 9-5"
              stroke="#00D2FF"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>

      {/* Brand name */}
      <div style={{ textAlign: 'center' }}>
        <p
          style={{
            fontSize: '18px',
            fontWeight: 800,
            color: '#ffffff',
            letterSpacing: '-0.3px',
            margin: 0,
            fontFamily: "'Inter', -apple-system, sans-serif",
          }}
        >
          ScoreZero
        </p>
        <p
          style={{
            fontSize: '11px',
            fontWeight: 500,
            color: '#00D2FF',
            letterSpacing: '2px',
            textTransform: 'uppercase',
            margin: '4px 0 0 0',
            fontFamily: "'Inter', -apple-system, sans-serif",
          }}
        >
          Loading…
        </p>
      </div>

      {/* Inline keyframes */}
      <style>{`
        @keyframes sz-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

